import { INotificationRepository } from "./IRepositories.js";
import { NotificationRecord } from "../models/types.js";
import { query } from "../db/postgresClient.js";

function parseJson(val: any): Record<string, any> {
  if (!val) return {};
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}

function mapRowToNotification(row: any): NotificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type || "system",
    title: row.title || "Notification",
    message: row.message || "",
    link: row.link || undefined,
    metadata: parseJson(row.metadata),
    channel: row.channel || "in_app",
    deliveryStatus: row.delivery_status || "delivered",
    isRead: row.is_read ?? false,
    readAt: row.read_at ? new Date(row.read_at).toISOString() : undefined,
    archived: row.archived ?? false,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export class NotificationRepository implements INotificationRepository {
  async getByUser(
    userId: string,
    options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
  ): Promise<{ notifications: NotificationRecord[]; total: number; unreadCount: number }> {
    const limit = Math.min(Math.max(options.limit || 30, 1), 100);
    const offset = Math.max(options.offset || 0, 0);

    let sql = `
      SELECT n.*,
             COUNT(*) OVER() as total_count,
             COUNT(*) FILTER (WHERE n.is_read = false AND n.archived = false) OVER() as unread_count
      FROM moas.notifications n
      WHERE n.user_id = $1 AND n.archived = false
    `;
    const params: any[] = [userId];

    if (options.unreadOnly) {
      sql += " AND n.is_read = false";
    }

    sql += " ORDER BY n.created_at DESC LIMIT $2 OFFSET $3;";
    params.push(limit, offset);

    const res = await query(sql, params);
    const total = res.rows.length > 0 ? parseInt(res.rows[0].total_count, 10) : 0;
    const unreadCount = res.rows.length > 0 ? parseInt(res.rows[0].unread_count, 10) : await this.getUnreadCount(userId);

    return {
      notifications: res.rows.map(mapRowToNotification),
      total,
      unreadCount,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const res = await query(
      "SELECT COUNT(*) as count FROM moas.notifications WHERE user_id = $1 AND is_read = false AND archived = false;",
      [userId]
    );
    return parseInt(res.rows[0]?.count || "0", 10);
  }

  async create(
    notif: Partial<NotificationRecord> & { userId: string; title: string; message: string }
  ): Promise<NotificationRecord> {
    // Ensure user exists
    const userExists = await query("SELECT id FROM moas.users WHERE id = $1 LIMIT 1;", [notif.userId]);
    if (userExists.rows.length === 0) {
      await query(
        `INSERT INTO moas.users (id, email, password_hash, role, name, email_verified)
        VALUES ($1, $2, 'scrypt:autogen', 'Candidate', 'User', true)
        ON CONFLICT (email) DO NOTHING;`,
        [notif.userId, `${notif.userId}@moas.ai`]
      );
    }

    const id = notif.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const metadataJson = JSON.stringify(notif.metadata || {});

    const res = await query(
      `INSERT INTO moas.notifications (
        id, user_id, type, title, message, link, metadata, channel, delivery_status, is_read, archived, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *;`,
      [
        id,
        notif.userId,
        notif.type || "system",
        notif.title,
        notif.message,
        notif.link || null,
        metadataJson,
        notif.channel || "in_app",
        notif.deliveryStatus || "delivered",
        notif.isRead ?? false,
        notif.archived ?? false,
      ]
    );

    return mapRowToNotification(res.rows[0]);
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    const res = await query(
      `UPDATE moas.notifications 
       SET is_read = true, read_at = NOW() 
       WHERE id = $1 AND user_id = $2;`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const res = await query(
      `UPDATE moas.notifications 
       SET is_read = true, read_at = NOW() 
       WHERE user_id = $1 AND is_read = false;`,
      [userId]
    );
    return res.rowCount ?? 0;
  }

  async archive(id: string, userId: string): Promise<boolean> {
    const res = await query(
      `UPDATE moas.notifications 
       SET archived = true 
       WHERE id = $1 AND user_id = $2;`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const res = await query(
      `DELETE FROM moas.notifications 
       WHERE id = $1 AND user_id = $2;`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async clearAll(userId: string): Promise<number> {
    const res = await query(
      `UPDATE moas.notifications
       SET archived = true
       WHERE user_id = $1 AND archived = false;`,
      [userId]
    );
    return res.rowCount ?? 0;
  }
}

export const notificationRepository = new NotificationRepository();
