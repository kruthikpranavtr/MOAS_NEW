import { IProfileViewRepository } from "./IRepositories.js";
import { ProfileViewRecord } from "../models/types.js";
import { query } from "../db/postgresClient.js";

function mapRowToView(row: any): ProfileViewRecord {
  return {
    id: row.id,
    userId: row.user_id,
    viewerType: row.viewer_type || "Recruiter",
    viewerName: row.viewer_name || "Verified Recruiter",
    viewerCompany: row.viewer_company || "AI Enterprise",
    viewerRole: row.viewer_role || "Technical Sourcer",
    viewerAvatar: row.viewer_avatar || undefined,
    recruiterId: row.viewer_id || undefined,
    recruiterName: row.viewer_name || "Verified Recruiter",
    recruiterCompany: row.viewer_company || "AI Enterprise",
    recruiterRole: row.viewer_role || "Technical Sourcer",
    recruiterAvatar: row.viewer_avatar || undefined,
    source: row.source || "Search & Recommendations",
    viewedAt: row.viewed_at || (row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()),
    durationSeconds: row.duration_seconds || 60,
    jobId: row.job_id || undefined,
    jobTitle: row.job_title || undefined,
    isVerifiedRecruiter: row.is_verified_recruiter ?? true,
  };
}

export class ProfileViewRepository implements IProfileViewRepository {
  async getAll(userId?: string): Promise<{ count: number; views: ProfileViewRecord[] }> {
    let sql = "SELECT * FROM profile_views";
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      sql += " WHERE user_id = $1";
    }

    sql += " ORDER BY created_at DESC;";
    const res = await query(sql, params);
    const views = res.rows.map(mapRowToView);
    return { count: views.length, views };
  }

  async record(view: Partial<ProfileViewRecord>): Promise<ProfileViewRecord> {
    const id = view.id || `view-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const userId = view.userId || "usr-anon";

    // Ensure viewed user exists
    const userExists = await query("SELECT id FROM users WHERE id = $1 LIMIT 1;", [userId]);
    if (userExists.rows.length === 0) {
      await query(
        `INSERT INTO users (id, email, password_hash, role, name, email_verified)
        VALUES ($1, $2, 'scrypt:autogen', 'Candidate', 'User', true)
        ON CONFLICT (email) DO NOTHING;`,
        [userId, `${userId}@moas.ai`]
      );
    }

    const res = await query(
      `INSERT INTO profile_views (
        id, user_id, viewer_type, viewer_name, viewer_company, viewer_role,
        viewer_avatar, source, viewed_at, duration_seconds, job_id, job_title, is_verified_recruiter
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;`,
      [
        id,
        userId,
        view.viewerType || "Recruiter",
        view.viewerName || view.recruiterName || "Talent Partner",
        view.viewerCompany || view.recruiterCompany || "Leading AI Lab",
        view.viewerRole || view.recruiterRole || "Senior Recruiter",
        view.viewerAvatar || view.recruiterAvatar || null,
        view.source || "Talent Match Engine",
        view.viewedAt || new Date().toISOString(),
        view.durationSeconds || 60,
        view.jobId || null,
        view.jobTitle || null,
        view.isVerifiedRecruiter ?? true,
      ]
    );

    return mapRowToView(res.rows[0]);
  }

  async clear(userId?: string): Promise<{ success: boolean; cleared: number } | boolean> {
    let sql = "DELETE FROM profile_views";
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      sql += " WHERE user_id = $1";
    }

    const res = await query(sql, params);
    return { success: true, cleared: res.rowCount ?? 0 };
  }
}

export const profileViewRepository = new ProfileViewRepository();
