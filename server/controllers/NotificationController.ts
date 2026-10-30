import { Response } from "express";
import { notificationService } from "../services/NotificationService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class NotificationController {
  async getNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user) {
        const queryUserId = req.query.userId as string | undefined;
        if (queryUserId && queryUserId !== req.user.userId && req.user.role !== "Admin") {
          return sendError(res, "Forbidden: Cannot access notifications for another user", 403);
        }
      }
      const userId = req.user?.userId || (req.query.userId as string) || "anonymous";
      const notifications = await notificationService.getUserNotifications(userId);
      return sendSuccess(res, {
        status: "scaffolded",
        notice: "Notification API v1 scaffolded for Phase 3; push gateway integration scheduled for Phase 4.",
        count: notifications.length,
        notifications,
      });
    } catch (error: any) {
      logger.error("[Notification] getNotifications error:", error);
      return sendError(res, error.message || "Failed to fetch notifications", 500);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user) {
        const bodyUserId = req.body.userId as string | undefined;
        if (bodyUserId && bodyUserId !== req.user.userId && req.user.role !== "Admin") {
          return sendError(res, "Forbidden: Cannot modify notifications for another user", 403);
        }
      }
      const userId = req.user?.userId || req.body.userId || "anonymous";
      const { id } = req.params;
      const success = await notificationService.markAsRead(userId, id);
      return sendSuccess(res, { success });
    } catch (error: any) {
      logger.error("[Notification] markAsRead error:", error);
      return sendError(res, error.message || "Failed to mark notification as read", 500);
    }
  }

  async clearAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user) {
        const bodyUserId = req.body.userId as string | undefined;
        if (bodyUserId && bodyUserId !== req.user.userId && req.user.role !== "Admin") {
          return sendError(res, "Forbidden: Cannot clear notifications for another user", 403);
        }
      }
      const userId = req.user?.userId || req.body.userId || "anonymous";
      const success = await notificationService.clearAll(userId);
      return sendSuccess(res, { success, message: "Notifications cleared successfully." });
    } catch (error: any) {
      logger.error("[Notification] clearAll error:", error);
      return sendError(res, error.message || "Failed to clear notifications", 500);
    }
  }
}

export const notificationController = new NotificationController();
