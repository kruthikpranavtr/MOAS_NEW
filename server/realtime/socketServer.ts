import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { sessionRepository } from "../repositories/SessionRepository.js";
import { messagingService } from "../services/MessagingService.js";
import { realtimeBus } from "./eventBus.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  userName?: string;
  isAlive?: boolean;
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts[0]?.trim();
    if (!name) return;
    const value = parts.slice(1).join("=").trim();
    try {
      list[name] = decodeURIComponent(value);
    } catch {
      list[name] = value;
    }
  });
  return list;
}

export class ChatWebSocketServer {
  private wss: WebSocketServer | null = null;
  private userSockets: Map<string, Set<AuthenticatedSocket>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  init(server: http.Server) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", async (request, socket, head) => {
      try {
        const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
        if (!url.pathname.startsWith("/ws/chat")) {
          // Allow other upgrade listeners if any
          return;
        }

        // Authenticate connection
        const cookies = parseCookies(request.headers.cookie);
        const cookieToken = cookies[config.auth.cookieName];
        const queryToken = url.searchParams.get("token");
        const authHeader = request.headers.authorization;
        const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;

        const token = queryToken || cookieToken || bearerToken;

        if (!token) {
          logger.warn("[WebSocket] Upgrade rejected: Missing session token.");
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        const sessionWithUser = await sessionRepository.getByToken(token);
        if (!sessionWithUser) {
          logger.warn("[WebSocket] Upgrade rejected: Invalid or expired session.");
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          const authWs = ws as AuthenticatedSocket;
          authWs.userId = sessionWithUser.user.id;
          authWs.userRole = sessionWithUser.user.role;
          authWs.userName = sessionWithUser.user.name;
          authWs.isAlive = true;
          this.wss!.emit("connection", authWs, request);
        });
      } catch (err) {
        logger.error("[WebSocket] Upgrade error:", err);
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
      }
    });

    this.wss.on("connection", (ws: AuthenticatedSocket) => {
      const userId = ws.userId;
      if (!userId) {
        ws.close(4001, "Unauthorized");
        return;
      }

      // Track connection
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(ws);

      logger.info(`[WebSocket] Client connected: user=${userId} (${ws.userRole})`);

      // Acknowledge connection
      this.sendSafe(ws, {
        type: "auth:success",
        user: {
          id: userId,
          role: ws.userRole,
          name: ws.userName,
        },
      });

      // Handle ping/pong heartbeat
      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", async (data: Buffer | string) => {
        try {
          const messageStr = data.toString();
          const parsed = JSON.parse(messageStr);

          await this.handleClientMessage(ws, parsed);
        } catch (err: any) {
          logger.error("[WebSocket] Message handling error:", err);
          this.sendSafe(ws, {
            type: "error",
            error: err.message || "Failed to process message",
          });
        }
      });

      ws.on("close", () => {
        const userSet = this.userSockets.get(userId);
        if (userSet) {
          userSet.delete(ws);
          if (userSet.size === 0) {
            this.userSockets.delete(userId);
          }
        }
        logger.info(`[WebSocket] Client disconnected: user=${userId}`);
      });

      ws.on("error", (err) => {
        logger.warn(`[WebSocket] Socket error for user=${userId}:`, err);
      });
    });

    // Setup heartbeat interval (every 30s)
    this.pingInterval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((client) => {
        const authWs = client as AuthenticatedSocket;
        if (authWs.isAlive === false) {
          return authWs.terminate();
        }
        authWs.isAlive = false;
        authWs.ping();
      });
    }, 30000);

    // Register event bus listeners
    this.setupEventBus();
  }

  private async handleClientMessage(ws: AuthenticatedSocket, message: any) {
    const caller = {
      userId: ws.userId!,
      role: ws.userRole,
    };

    switch (message.type) {
      case "ping":
        this.sendSafe(ws, { type: "pong", timestamp: Date.now() });
        break;

      case "chat:message": {
        const { conversationId, text } = message;
        if (!conversationId || !text) {
          this.sendSafe(ws, { type: "error", error: "conversationId and text required" });
          return;
        }

        const saved = await messagingService.sendMessage(conversationId, caller, text);
        this.sendSafe(ws, {
          type: "chat:message_ack",
          conversationId,
          message: saved,
        });
        break;
      }

      case "chat:read": {
        const { conversationId } = message;
        if (conversationId) {
          await messagingService.markAsRead(conversationId, caller);
        }
        break;
      }

      case "chat:typing": {
        const { conversationId, isTyping } = message;
        if (conversationId) {
          await messagingService.setTyping(conversationId, caller, Boolean(isTyping));
        }
        break;
      }

      default:
        this.sendSafe(ws, { type: "error", error: `Unknown event type: ${message.type}` });
    }
  }

  private setupEventBus() {
    realtimeBus.on("message:new", ({ conversationId, recipientId, message }) => {
      this.sendToUser(recipientId, {
        type: "chat:message",
        conversationId,
        message,
      });
    });

    realtimeBus.on("message:read", ({ conversationId, recipientId, readerId }) => {
      this.sendToUser(recipientId, {
        type: "chat:read",
        conversationId,
        readerId,
      });
    });

    realtimeBus.on("message:typing", ({ conversationId, recipientId, senderId, isTyping }) => {
      this.sendToUser(recipientId, {
        type: "chat:typing",
        conversationId,
        senderId,
        isTyping,
      });
    });

    realtimeBus.on("notification:new", ({ userId, notification }) => {
      this.sendToUser(userId, {
        type: "notification:new",
        notification,
      });
    });
  }

  sendToUser(userId: string, payload: any) {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return false;

    for (const ws of sockets) {
      this.sendSafe(ws, payload);
    }
    return true;
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return Boolean(sockets && sockets.size > 0);
  }

  private sendSafe(ws: WebSocket, payload: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.userSockets.clear();
  }
}

export const socketServer = new ChatWebSocketServer();
