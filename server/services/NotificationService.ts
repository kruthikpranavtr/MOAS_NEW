/**
 * Notification Service
 *
 * MODULE STATUS:
 * [PLANNED & SCAFFOLDED]
 * Currently, the React frontend renders system and job alert notifications in local application state.
 * This service implements the modular backend foundation for multi-user notifications, persistence,
 * and delivery. Full push notification gateways (WebPush / FCM / Email digest) are scheduled for Phase 4.
 */

export interface ServerNotification {
  id: string;
  userId: string;
  title: string;
  description: string;
  time: string;
  type: "job" | "application" | "system";
  company?: string;
  read?: boolean;
}

export class NotificationService {
  private notifications: Map<string, ServerNotification[]> = new Map();

  async getUserNotifications(userId: string): Promise<ServerNotification[]> {
    if (!userId) return [];
    return this.notifications.get(userId) || [];
  }

  async createNotification(
    userId: string,
    data: Omit<ServerNotification, "id" | "time" | "userId">
  ): Promise<ServerNotification> {
    const list = this.notifications.get(userId) || [];
    const notif: ServerNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      title: data.title,
      description: data.description,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: data.type || "system",
      company: data.company,
      read: false,
    };

    list.unshift(notif);
    this.notifications.set(userId, list.slice(0, 50)); // Keep last 50
    return notif;
  }

  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const list = this.notifications.get(userId);
    if (!list) return false;
    const item = list.find((n) => n.id === notificationId);
    if (item) {
      item.read = true;
      return true;
    }
    return false;
  }

  async clearAll(userId: string): Promise<boolean> {
    this.notifications.set(userId, []);
    return true;
  }
}

export const notificationService = new NotificationService();
