import { notificationRepository } from "../repositories/NotificationRepository.js";
import { NotificationRecord } from "../models/types.js";
import { realtimeBus } from "../realtime/eventBus.js";
import { logger } from "../utils/logger.js";

export interface CreateNotificationInput {
  title: string;
  message?: string;
  description?: string;
  type?: string;
  company?: string;
  metadata?: Record<string, any>;
  channel?: "in_app" | "email" | "sms";
}

export class NotificationService {
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<{ notifications: NotificationRecord[]; unreadCount: number; total: number }> {
    if (!userId) return { notifications: [], unreadCount: 0, total: 0 };
    const { notifications, unreadCount, total } = await notificationRepository.getByUser(userId, {
      limit,
      offset,
      unreadOnly,
    });
    return { notifications, unreadCount, total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;
    return await notificationRepository.getUnreadCount(userId);
  }

  async createNotification(
    userId: string,
    input: CreateNotificationInput
  ): Promise<NotificationRecord> {
    const message = input.message || input.description || input.title;
    const metadata = {
      ...(input.metadata || {}),
      ...(input.company ? { company: input.company } : {}),
    };

    const record = await notificationRepository.create({
      userId,
      type: input.type || "system",
      title: input.title,
      message,
      isRead: false,
      channel: input.channel || "in_app",
      deliveryStatus: "delivered",
      metadata,
    });

    try {
      realtimeBus.emit("notification:new", { userId, notification: record });
    } catch (busErr) {
      logger.warn("[NotificationService] realtime bus emit error:", busErr);
    }

    return record;
  }

  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    if (!userId || !notificationId) return false;
    return await notificationRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    if (!userId) return false;
    const count = await notificationRepository.markAllAsRead(userId);
    return count >= 0;
  }

  async archive(userId: string, notificationId: string): Promise<boolean> {
    if (!userId || !notificationId) return false;
    return await notificationRepository.archive(notificationId, userId);
  }

  async delete(userId: string, notificationId: string): Promise<boolean> {
    if (!userId || !notificationId) return false;
    return await notificationRepository.delete(notificationId, userId);
  }

  async clearAll(userId: string): Promise<boolean> {
    if (!userId) return false;
    const count = await notificationRepository.clearAll(userId);
    return count >= 0;
  }
}

export const notificationService = new NotificationService();
