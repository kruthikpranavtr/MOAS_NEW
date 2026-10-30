import { IJobAlertRepository } from "./IRepositories.js";
import { JobAlertRecord } from "../models/types.js";
import { query } from "../db/postgresClient.js";

function mapRowToAlert(row: any): JobAlertRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.role || row.keyword || "Job Alert",
    query: row.keyword || undefined,
    keyword: row.keyword || undefined,
    location: row.location || undefined,
    role: row.role || undefined,
    frequency: (row.frequency as any) || "Weekly",
    channel: "Email",
    active: row.active ?? true,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export class JobAlertRepository implements IJobAlertRepository {
  async getByUser(userId: string): Promise<JobAlertRecord[]> {
    const res = await query(
      "SELECT * FROM job_alerts WHERE user_id = $1 ORDER BY created_at DESC;",
      [userId]
    );
    return res.rows.map(mapRowToAlert);
  }

  async save(alert: JobAlertRecord): Promise<JobAlertRecord> {
    // Ensure user exists
    const userExists = await query("SELECT id FROM users WHERE id = $1 LIMIT 1;", [alert.userId]);
    if (userExists.rows.length === 0) {
      await query(
        `INSERT INTO users (id, email, password_hash, role, name, email_verified)
        VALUES ($1, $2, 'scrypt:autogen', 'Candidate', 'User', true)
        ON CONFLICT (email) DO NOTHING;`,
        [alert.userId, `${alert.userId}@moas.ai`]
      );
    }

    const keyword = alert.keyword || alert.query || alert.title || null;
    const res = await query(
      `INSERT INTO job_alerts (
        id, user_id, keyword, location, role, frequency, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        keyword = EXCLUDED.keyword,
        location = EXCLUDED.location,
        role = EXCLUDED.role,
        frequency = EXCLUDED.frequency,
        active = EXCLUDED.active,
        updated_at = NOW()
      RETURNING *;`,
      [
        alert.id,
        alert.userId,
        keyword,
        alert.location || null,
        alert.role || null,
        alert.frequency || "Weekly",
        alert.active ?? true,
      ]
    );

    return mapRowToAlert(res.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const res = await query("DELETE FROM job_alerts WHERE id = $1;", [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const jobAlertRepository = new JobAlertRepository();
