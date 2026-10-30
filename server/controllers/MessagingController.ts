import { Request, Response } from "express";
import { messagingService } from "../services/MessagingService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class MessagingController {
  async getConversations(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId || (req.query.userId as string) || "";
      const conversations = await messagingService.getConversations(userId);
      return sendSuccess(res, {
        status: "scaffolded",
        notice: "Messaging API v1 scaffolded for Phase 3; full real-time WebSockets scheduled for Phase 4.",
        count: conversations.length,
        conversations,
      });
    } catch (error: any) {
      logger.error("[Messaging] getConversations error:", error);
      return sendError(res, error.message || "Failed to fetch conversations", 500);
    }
  }

  async getConversationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const conversation = await messagingService.getConversationById(id);
      if (!conversation) {
        return sendError(res, `Conversation with ID "${id}" not found`, 404);
      }
      return sendSuccess(res, { conversation });
    } catch (error: any) {
      logger.error("[Messaging] getConversationById error:", error);
      return sendError(res, error.message || "Failed to fetch conversation", 500);
    }
  }

  async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { conversationId, text, sender = "user" } = req.body;
      if (!conversationId || !text) {
        return sendError(res, "conversationId and text are required", 400);
      }

      const message = await messagingService.sendMessage(conversationId, {
        sender,
        text,
      });

      return sendSuccess(res, { message }, 201);
    } catch (error: any) {
      logger.error("[Messaging] sendMessage error:", error);
      return sendError(res, error.message || "Failed to send message", 500);
    }
  }
}

export const messagingController = new MessagingController();
