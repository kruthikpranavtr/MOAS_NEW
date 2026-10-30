import { query } from "../db/postgresClient.js";
import { UserSession } from "../models/types.js";
import { logger } from "../utils/logger.js";

export interface DbSessionRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  lastActiveAt: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface SessionWithUser {
  session: DbSessionRecord;
  user: {
    id: string;
    email: string;
    username?: string;
    role: string;
    name: string;
    avatarUrl?: string;
    companyName?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
  };
}

export class SessionRepository {
  async create(data: {
    id?: string;
    userId: string;
    token: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<DbSessionRecord> {
    const id = data.id || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const res = await query(
      `INSERT INTO moas.sessions (
        id, user_id, token, expires_at, user_agent, ip_address, created_at, last_active_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *;`,
      [id, data.userId, data.token, data.expiresAt.toISOString(), data.userAgent || null, data.ipAddress || null]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      expiresAt: new Date(row.expires_at).toISOString(),
      createdAt: new Date(row.created_at).toISOString(),
      lastActiveAt: new Date(row.last_active_at).toISOString(),
      userAgent: row.user_agent || undefined,
      ipAddress: row.ip_address || undefined,
    };
  }

  async getByToken(token: string): Promise<SessionWithUser | null> {
    if (!token) return null;
    const res = await query(
      `SELECT 
        s.id as session_id,
        s.user_id,
        s.token,
        s.expires_at,
        s.created_at as session_created_at,
        s.last_active_at,
        s.user_agent,
        s.ip_address,
        u.email,
        u.username,
        u.role,
        u.name,
        u.avatar_url,
        u.company_name,
        u.email_verified,
        u.phone_verified
      FROM moas.sessions s
      JOIN moas.users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > NOW()
      LIMIT 1;`,
      [token]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    // Background update last_active_at
    query("UPDATE moas.sessions SET last_active_at = NOW() WHERE id = $1;", [row.session_id]).catch((err) =>
      logger.warn("[SessionRepository] Failed to update last_active_at:", err?.message)
    );

    return {
      session: {
        id: row.session_id,
        userId: row.user_id,
        token: row.token,
        expiresAt: new Date(row.expires_at).toISOString(),
        createdAt: new Date(row.session_created_at).toISOString(),
        lastActiveAt: new Date(row.last_active_at).toISOString(),
        userAgent: row.user_agent || undefined,
        ipAddress: row.ip_address || undefined,
      },
      user: {
        id: row.user_id,
        email: row.email,
        username: row.username || undefined,
        role: row.role || "Candidate",
        name: row.name,
        avatarUrl: row.avatar_url || undefined,
        companyName: row.company_name || undefined,
        emailVerified: row.email_verified ?? false,
        phoneVerified: row.phone_verified ?? false,
      },
    };
  }

  async delete(token: string): Promise<boolean> {
    if (!token) return false;
    const res = await query("DELETE FROM moas.sessions WHERE token = $1;", [token]);
    return (res.rowCount ?? 0) > 0;
  }

  async deleteAllForUser(userId: string): Promise<number> {
    if (!userId) return 0;
    const res = await query("DELETE FROM moas.sessions WHERE user_id = $1;", [userId]);
    return res.rowCount ?? 0;
  }

  async pruneExpired(): Promise<number> {
    const res = await query("DELETE FROM moas.sessions WHERE expires_at <= NOW();");
    return res.rowCount ?? 0;
  }
}

export const sessionRepository = new SessionRepository();
