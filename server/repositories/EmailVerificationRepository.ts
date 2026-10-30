import { query } from "../db/postgresClient.js";

export interface DbEmailVerificationRecord {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: string;
  verified: boolean;
  createdAt: string;
}

export class EmailVerificationRepository {
  async create(data: {
    userId: string;
    email: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<DbEmailVerificationRecord> {
    const id = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Invalidate existing pending verifications for this user
    await query("UPDATE moas.email_verifications SET verified = true WHERE user_id = $1 AND verified = false;", [data.userId]);

    const res = await query(
      `INSERT INTO moas.email_verifications (
        id, user_id, email, token_hash, expires_at, verified, created_at
      ) VALUES ($1, $2, $3, $4, $5, false, NOW())
      RETURNING *;`,
      [id, data.userId, data.email, data.tokenHash, data.expiresAt.toISOString()]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      tokenHash: row.token_hash,
      expiresAt: new Date(row.expires_at).toISOString(),
      verified: row.verified,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async getByTokenHash(tokenHash: string): Promise<DbEmailVerificationRecord | null> {
    const res = await query(
      `SELECT * FROM moas.email_verifications 
      WHERE token_hash = $1 AND verified = false AND expires_at > NOW() 
      LIMIT 1;`,
      [tokenHash]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      tokenHash: row.token_hash,
      expiresAt: new Date(row.expires_at).toISOString(),
      verified: row.verified,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async markVerified(id: string): Promise<boolean> {
    const res = await query("UPDATE moas.email_verifications SET verified = true WHERE id = $1;", [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const emailVerificationRepository = new EmailVerificationRepository();
