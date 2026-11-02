import { Response } from "express";
import { messagingService } from "../services/MessagingService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class MessagingController {
  async getConversations(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to view conversations", 401);
      }

      const callerId = req.user.userId;
      const callerRole = (req.user.role || "").toLowerCase();
      const queryUserId = req.query.userId as string | undefined;

      // Access control: only self or admin can query
      if (queryUserId && queryUserId !== callerId && callerRole !== "admin") {
        return sendError(res, "Forbidden: Cannot access conversations for another user", 403);
      }

      const targetUserId = callerRole === "admin" && queryUserId ? queryUserId : callerId;
      const conversations = await messagingService.getConversations(targetUserId);

      return sendSuccess(res, {
        count: conversations.length,
        conversations,
      });
    } catch (error: any) {
      logger.error("[Messaging] getConversations error:", error);
      return sendError(res, error.message || "Failed to fetch conversations", 500);
    }
  }

  async getConversationById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required", 401);
      }

      const { id } = req.params;
      const caller = { userId: req.user.userId, role: req.user.role };
      const conversation = await messagingService.getConversationById(id, caller);

      if (!conversation) {
        return sendError(res, `Conversation with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { conversation });
    } catch (error: any) {
      logger.error("[Messaging] getConversationById error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to fetch conversation", statusCode);
    }
  }

  async createConversation(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to initiate a conversation", 401);
      }

      const caller = { userId: req.user.userId, role: req.user.role };
      const conversation = await messagingService.createConversation(caller, req.body);

      return sendSuccess(res, { conversation }, 201);
    } catch (error: any) {
      logger.error("[Messaging] createConversation error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to create conversation", statusCode);
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to view messages", 401);
      }

      const { id } = req.params;
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
      const before = req.query.before as string | undefined;

      const caller = { userId: req.user.userId, role: req.user.role };
      const messages = await messagingService.getMessages(id, caller, limit, before);

      return sendSuccess(res, { count: messages.length, messages });
    } catch (error: any) {
      logger.error("[Messaging] getMessages error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to fetch messages", statusCode);
    }
  }

  async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to send messages", 401);
      }

      const conversationId = req.params.id || req.body.conversationId;
      const text = req.body.text || req.body.content;

      if (!conversationId || !text) {
        return sendError(res, "conversationId and text are required", 400);
      }

      const caller = { userId: req.user.userId, role: req.user.role };
      const message = await messagingService.sendMessage(conversationId, caller, text);

      return sendSuccess(res, { message }, 201);
    } catch (error: any) {
      logger.error("[Messaging] sendMessage error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to send message", statusCode);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required", 401);
      }

      const { id } = req.params;
      const caller = { userId: req.user.userId, role: req.user.role };
      const result = await messagingService.markAsRead(id, caller);

      return sendSuccess(res, { success: true, updatedCount: result.count });
    } catch (error: any) {
      logger.error("[Messaging] markAsRead error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to mark messages as read", statusCode);
    }
  }

  async sendTyping(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required", 401);
      }

      const { id } = req.params;
      const isTyping = Boolean(req.body.isTyping);
      const caller = { userId: req.user.userId, role: req.user.role };
      const success = await messagingService.setTyping(id, caller, isTyping);

      return sendSuccess(res, { success });
    } catch (error: any) {
      logger.error("[Messaging] sendTyping error:", error);
      return sendError(res, error.message || "Failed to update typing indicator", 500);
    }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required", 401);
      }

      const count = await messagingService.getUnreadCount(req.user.userId);
      return sendSuccess(res, { unreadCount: count });
    } catch (error: any) {
      logger.error("[Messaging] getUnreadCount error:", error);
      return sendError(res, error.message || "Failed to fetch unread count", 500);
    }
  }
}

export const messagingController = new MessagingController();
