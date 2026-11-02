import { Response } from "express";
import { notificationService } from "../services/NotificationService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class NotificationController {
  async getNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to view notifications", 401);
      }

      const callerId = req.user.userId;
      const callerRole = (req.user.role || "").toLowerCase();
      const queryUserId = req.query.userId as string | undefined;

      // Ownership enforcement: Candidates & employers can only read their own notifications
      if (queryUserId && queryUserId !== callerId && callerRole !== "admin") {
        return sendError(res, "Forbidden: Cannot access notifications for another user", 403);
      }

      const targetUserId = callerRole === "admin" && queryUserId ? queryUserId : callerId;
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const unreadOnly = req.query.unreadOnly === "true";

      const { notifications, unreadCount } = await notificationService.getUserNotifications(
        targetUserId,
        limit,
        offset,
        unreadOnly
      );

      return sendSuccess(res, {
        count: notifications.length,
        unreadCount,
        notifications,
      });
    } catch (error: any) {
      logger.error("[Notification] getNotifications error:", error);
      return sendError(res, error.message || "Failed to fetch notifications", 500);
    }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required", 401);
      }

      const unreadCount = await notificationService.getUnreadCount(req.user.userId);
      return sendSuccess(res, { unreadCount });
    } catch (error: any) {
      logger.error("[Notification] getUnreadCount error:", error);
      return sendError(res, error.message || "Failed to get unread count", 500);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required", 401);
      }

      const { id } = req.params;
      const success = await notificationService.markAsRead(req.user.userId, id);
      if (!success) {
        return sendError(res, "Notification not found or unauthorized", 404);
      }

      return sendSuccess(res, { success, message: "Notification marked as read" });
    } catch (error: any) {
      logger.error("[Notification] markAsRead error:", error);
      return sendError(res, error.message || "Failed to mark notification as read", 500);
    }
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required", 401);
      }

      const success = await notificationService.markAllAsRead(req.user.userId);
      return sendSuccess(res, { success, message: "All notifications marked as read" });
    } catch (error: any) {
      logger.error("[Notification] markAllAsRead error:", error);
      return sendError(res, error.message || "Failed to mark all notifications as read", 500);
    }
  }

  async archive(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required", 401);
      }

      const { id } = req.params;
      const success = await notificationService.archive(req.user.userId, id);
      if (!success) {
        return sendError(res, "Notification not found or unauthorized", 404);
      }

      return sendSuccess(res, { success, message: "Notification archived" });
    } catch (error: any) {
      logger.error("[Notification] archive error:", error);
      return sendError(res, error.message || "Failed to archive notification", 500);
    }
  }

  async deleteNotification(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required", 401);
      }

      const { id } = req.params;
      const success = await notificationService.delete(req.user.userId, id);
      if (!success) {
        return sendError(res, "Notification not found or unauthorized", 404);
      }

      return sendSuccess(res, { success, message: "Notification deleted" });
    } catch (error: any) {
      logger.error("[Notification] deleteNotification error:", error);
      return sendError(res, error.message || "Failed to delete notification", 500);
    }
  }

  async clearAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required", 401);
      }

      const success = await notificationService.clearAll(req.user.userId);
      return sendSuccess(res, { success, message: "Notifications cleared successfully." });
    } catch (error: any) {
      logger.error("[Notification] clearAll error:", error);
      return sendError(res, error.message || "Failed to clear notifications", 500);
    }
  }
}

export const notificationController = new NotificationController();
