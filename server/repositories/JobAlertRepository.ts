import { IJobAlertRepository } from "./IRepositories.js";
import { JobAlertRecord, JobAlertDeliveryRecord } from "../models/types.js";
import { query } from "../db/postgresClient.js";

function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRowToAlert(row: any): JobAlertRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.role || row.keyword || "Job Alert",
    query: row.keyword || undefined,
    keyword: row.keyword || undefined,
    location: row.location || undefined,
    role: row.role || undefined,
    category: row.category || undefined,
    workMode: row.work_mode || undefined,
    minSalary: row.min_salary !== null && row.min_salary !== undefined ? parseFloat(row.min_salary) : undefined,
    experience: row.experience || undefined,
    skills: parseJsonArray(row.skills),
    frequency: (row.frequency as any) || "Weekly",
    channel: "Email",
    active: row.active ?? true,
    lastProcessedAt: row.last_processed_at ? new Date(row.last_processed_at).toISOString() : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export class JobAlertRepository implements IJobAlertRepository {
  async getByUser(userId: string): Promise<JobAlertRecord[]> {
    const res = await query(
      "SELECT * FROM moas.job_alerts WHERE user_id = $1 ORDER BY created_at DESC;",
      [userId]
    );
    return res.rows.map(mapRowToAlert);
  }

  async getAllActive(): Promise<JobAlertRecord[]> {
    const res = await query(
      "SELECT * FROM moas.job_alerts WHERE active = true ORDER BY created_at DESC;"
    );
    return res.rows.map(mapRowToAlert);
  }

  async save(alert: JobAlertRecord): Promise<JobAlertRecord> {
    // Ensure user exists
    const userExists = await query("SELECT id FROM moas.users WHERE id = $1 LIMIT 1;", [alert.userId]);
    if (userExists.rows.length === 0) {
      await query(
        `INSERT INTO moas.users (id, email, password_hash, role, name, email_verified)
        VALUES ($1, $2, 'scrypt:autogen', 'Candidate', 'User', true)
        ON CONFLICT (email) DO NOTHING;`,
        [alert.userId, `${alert.userId}@moas.ai`]
      );
    }

    const keyword = alert.keyword || alert.query || alert.title || null;
    const skillsJson = JSON.stringify(alert.skills || []);

    const res = await query(
      `INSERT INTO moas.job_alerts (
        id, user_id, keyword, location, role, category, work_mode, min_salary, experience, skills, frequency, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        keyword = EXCLUDED.keyword,
        location = EXCLUDED.location,
        role = EXCLUDED.role,
        category = EXCLUDED.category,
        work_mode = EXCLUDED.work_mode,
        min_salary = EXCLUDED.min_salary,
        experience = EXCLUDED.experience,
        skills = EXCLUDED.skills,
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
        alert.category || null,
        alert.workMode || null,
        alert.minSalary !== undefined ? alert.minSalary : null,
        alert.experience || null,
        skillsJson,
        alert.frequency || "Weekly",
        alert.active ?? true,
      ]
    );

    return mapRowToAlert(res.rows[0]);
  }

  async update(id: string, updates: Partial<JobAlertRecord>): Promise<JobAlertRecord | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const merged: JobAlertRecord = {
      ...existing,
      ...updates,
      id,
    };
    return await this.save(merged);
  }

  async getById(id: string): Promise<JobAlertRecord | null> {
    const res = await query("SELECT * FROM moas.job_alerts WHERE id = $1 LIMIT 1;", [id]);
    if (res.rows.length === 0) return null;
    return mapRowToAlert(res.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const res = await query("DELETE FROM moas.job_alerts WHERE id = $1;", [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async recordDelivery(
    alertId: string,
    userId: string,
    jobId: string,
    channel = "in_app"
  ): Promise<JobAlertDeliveryRecord> {
    const id = `del-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const res = await query(
      `INSERT INTO moas.job_alert_deliveries (
        id, alert_id, user_id, job_id, delivered_at, channel
      ) VALUES ($1, $2, $3, $4, NOW(), $5)
      ON CONFLICT (alert_id, job_id) DO UPDATE SET delivered_at = NOW()
      RETURNING *;`,
      [id, alertId, userId, jobId, channel]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      alertId: row.alert_id,
      userId: row.user_id,
      jobId: row.job_id,
      deliveredAt: new Date(row.delivered_at).toISOString(),
      channel: row.channel,
    };
  }

  async hasDelivered(alertId: string, jobId: string): Promise<boolean> {
    const res = await query(
      "SELECT 1 FROM moas.job_alert_deliveries WHERE alert_id = $1 AND job_id = $2 LIMIT 1;",
      [alertId, jobId]
    );
    return res.rows.length > 0;
  }
}

export const jobAlertRepository = new JobAlertRepository();
