import { query } from "../db/postgresClient.js";

export interface DbPasswordResetRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export class PasswordResetRepository {
  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<DbPasswordResetRecord> {
    const id = `pr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Invalidate prior unused reset tokens for this user
    await query("UPDATE moas.password_resets SET used = true WHERE user_id = $1 AND used = false;", [data.userId]);

    const res = await query(
      `INSERT INTO moas.password_resets (
        id, user_id, token_hash, expires_at, used, created_at
      ) VALUES ($1, $2, $3, $4, false, NOW())
      RETURNING *;`,
      [id, data.userId, data.tokenHash, data.expiresAt.toISOString()]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: new Date(row.expires_at).toISOString(),
      used: row.used,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async getByTokenHash(tokenHash: string): Promise<DbPasswordResetRecord | null> {
    const res = await query(
      `SELECT * FROM moas.password_resets 
      WHERE token_hash = $1 AND used = false AND expires_at > NOW() 
      LIMIT 1;`,
      [tokenHash]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: new Date(row.expires_at).toISOString(),
      used: row.used,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async markUsed(id: string): Promise<boolean> {
    const res = await query("UPDATE moas.password_resets SET used = true WHERE id = $1;", [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const passwordResetRepository = new PasswordResetRepository();
