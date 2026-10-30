import { query } from "../db/postgresClient.js";

export interface DbOtpRecord {
  id: string;
  identifier: string;
  otpHash: string;
  purpose: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  verified: boolean;
  resendAvailableAt: string;
  createdAt: string;
}

export class OtpRepository {
  async create(data: {
    id?: string;
    identifier: string;
    otpHash: string;
    purpose?: string;
    expiresAt: Date;
    resendAvailableAt: Date;
    maxAttempts?: number;
  }): Promise<DbOtpRecord> {
    const id = data.id || `otp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const purpose = data.purpose || "phone_verification";
    const maxAttempts = data.maxAttempts ?? 5;

    // Invalidate any existing unverified OTP for this identifier and purpose
    await query(
      "UPDATE moas.otp_codes SET verified = true WHERE identifier = $1 AND purpose = $2 AND verified = false;",
      [data.identifier, purpose]
    );

    const res = await query(
      `INSERT INTO moas.otp_codes (
        id, identifier, otp_hash, purpose, attempts, max_attempts, expires_at, verified, resend_available_at, created_at
      ) VALUES ($1, $2, $3, $4, 0, $5, $6, false, $7, NOW())
      RETURNING *;`,
      [
        id,
        data.identifier,
        data.otpHash,
        purpose,
        maxAttempts,
        data.expiresAt.toISOString(),
        data.resendAvailableAt.toISOString(),
      ]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      identifier: row.identifier,
      otpHash: row.otp_hash,
      purpose: row.purpose,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      expiresAt: new Date(row.expires_at).toISOString(),
      verified: row.verified,
      resendAvailableAt: new Date(row.resend_available_at).toISOString(),
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async getLatestActive(identifier: string, purpose = "phone_verification"): Promise<DbOtpRecord | null> {
    const res = await query(
      `SELECT * FROM moas.otp_codes
      WHERE identifier = $1 AND purpose = $2 AND verified = false
      ORDER BY created_at DESC
      LIMIT 1;`,
      [identifier, purpose]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      identifier: row.identifier,
      otpHash: row.otp_hash,
      purpose: row.purpose,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      expiresAt: new Date(row.expires_at).toISOString(),
      verified: row.verified,
      resendAvailableAt: new Date(row.resend_available_at).toISOString(),
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async incrementAttempts(id: string): Promise<number> {
    const res = await query(
      "UPDATE moas.otp_codes SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts;",
      [id]
    );
    return res.rows[0]?.attempts ?? 0;
  }

  async markVerified(id: string): Promise<boolean> {
    const res = await query(
      "UPDATE moas.otp_codes SET verified = true WHERE id = $1;",
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async delete(id: string): Promise<boolean> {
    const res = await query("DELETE FROM moas.otp_codes WHERE id = $1;", [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const otpRepository = new OtpRepository();
