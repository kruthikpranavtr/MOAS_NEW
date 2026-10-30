import { IApplicationRepository } from "./IRepositories.js";
import { ApplicationRecord } from "../models/types.js";
import { query, withTransaction } from "../db/postgresClient.js";

function mapRowToApplication(row: any): ApplicationRecord {
  return {
    id: row.id,
    jobId: row.job_id,
    jobTitle: row.job_title,
    company: row.company,
    candidateId: row.candidate_id,
    candidateName: row.candidate_name,
    candidateEmail: row.candidate_email || "",
    appliedDate: row.applied_date || "Today",
    status: row.status || "Applied",
    stage: row.stage || "Initial Screening",
    matchScore: row.match_score ?? 85,
    resumeName: row.resume_name || "Resume.pdf",
    notes: row.notes || undefined,
  };
}

export class ApplicationRepository implements IApplicationRepository {
  async getAll(candidateId?: string): Promise<ApplicationRecord[]> {
    let sql = "SELECT * FROM applications";
    const params: any[] = [];

    if (candidateId) {
      params.push(candidateId);
      sql += " WHERE candidate_id = $1";
    }

    sql += " ORDER BY created_at DESC;";
    const res = await query(sql, params);
    return res.rows.map(mapRowToApplication);
  }

  async getForEmployer(employerUserId: string, jobId?: string): Promise<ApplicationRecord[]> {
    let sql = `
      SELECT DISTINCT a.* 
      FROM moas.applications a
      JOIN moas.jobs j ON a.job_id = j.id
      LEFT JOIN moas.company_members cm ON j.company_id = cm.company_id AND cm.user_id = $1 AND cm.is_verified = true
      WHERE (cm.user_id IS NOT NULL OR j.posted_by = $1)
    `;
    const params: any[] = [employerUserId];

    if (jobId) {
      params.push(jobId);
      sql += ` AND a.job_id = $2`;
    }

    sql += " ORDER BY a.created_at DESC;";
    const res = await query(sql, params);
    return res.rows.map(mapRowToApplication);
  }

  async isApplicantForEmployer(applicationId: string, employerUserId: string): Promise<boolean> {
    const res = await query(
      `SELECT 1 
       FROM moas.applications a
       JOIN moas.jobs j ON a.job_id = j.id
       LEFT JOIN moas.company_members cm ON j.company_id = cm.company_id AND cm.user_id = $2 AND cm.is_verified = true
       WHERE a.id = $1 AND (cm.user_id IS NOT NULL OR j.posted_by = $2)
       LIMIT 1;`,
      [applicationId, employerUserId]
    );

    return res.rows.length > 0;
  }

  async isCandidateApplicantForEmployer(candidateUserId: string, employerUserId: string): Promise<boolean> {
    const res = await query(
      `SELECT 1 
       FROM moas.applications a
       JOIN moas.jobs j ON a.job_id = j.id
       LEFT JOIN moas.company_members cm ON j.company_id = cm.company_id AND cm.user_id = $2 AND cm.is_verified = true
       WHERE a.candidate_id = $1 AND (cm.user_id IS NOT NULL OR j.posted_by = $2)
       LIMIT 1;`,
      [candidateUserId, employerUserId]
    );

    return res.rows.length > 0;
  }

  async getById(id: string): Promise<ApplicationRecord | null> {
    const res = await query("SELECT * FROM applications WHERE id = $1 LIMIT 1;", [id]);
    if (res.rows.length === 0) return null;
    return mapRowToApplication(res.rows[0]);
  }

  async create(app: ApplicationRecord): Promise<ApplicationRecord> {
    return await withTransaction(async (client) => {
      // 1. Ensure candidate exists
      const userExists = await client.query("SELECT id FROM users WHERE id = $1 LIMIT 1;", [app.candidateId]);
      if (userExists.rows.length === 0) {
        await client.query(
          `INSERT INTO users (id, email, password_hash, role, name, email_verified)
          VALUES ($1, $2, 'scrypt:autogen', 'Candidate', $3, true)
          ON CONFLICT (email) DO NOTHING;`,
          [app.candidateId, app.candidateEmail || `${app.candidateId}@moas.ai`, app.candidateName || "Candidate"]
        );
      }

      // 2. Ensure job exists
      const jobExists = await client.query("SELECT id FROM jobs WHERE id = $1 LIMIT 1;", [app.jobId]);
      if (jobExists.rows.length === 0) {
        await client.query(
          `INSERT INTO jobs (id, title, company, status)
          VALUES ($1, $2, $3, 'open')
          ON CONFLICT (id) DO NOTHING;`,
          [app.jobId, app.jobTitle || "Job", app.company || "Company"]
        );
      }

      // 3. Insert Application
      const res = await client.query(
        `INSERT INTO applications (
          id, job_id, job_title, company, candidate_id, candidate_name, candidate_email,
          applied_date, status, stage, match_score, resume_name, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          stage = EXCLUDED.stage,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING *;`,
        [
          app.id,
          app.jobId,
          app.jobTitle,
          app.company,
          app.candidateId,
          app.candidateName,
          app.candidateEmail || null,
          app.appliedDate || "Just now",
          app.status || "Applied",
          app.stage || "Initial Screening",
          app.matchScore ?? 85,
          app.resumeName || null,
          app.notes || null,
        ]
      );

      // 4. Atomically increment applicant_count in jobs table
      await client.query(
        "UPDATE jobs SET applicant_count = applicant_count + 1 WHERE id = $1;",
        [app.jobId]
      );

      return mapRowToApplication(res.rows[0]);
    });
  }

  async updateStatus(id: string, status: ApplicationRecord["status"], stage?: string): Promise<ApplicationRecord | null> {
    const res = await query(
      `UPDATE applications
      SET status = $2, stage = COALESCE($3, stage), updated_at = NOW()
      WHERE id = $1
      RETURNING *;`,
      [id, status, stage || null]
    );

    if (res.rows.length === 0) return null;
    return mapRowToApplication(res.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    return await withTransaction(async (client) => {
      const existing = await client.query("SELECT job_id FROM applications WHERE id = $1 LIMIT 1;", [id]);
      if (existing.rows.length === 0) {
        return false;
      }

      const jobId = existing.rows[0].job_id;
      const res = await client.query("DELETE FROM applications WHERE id = $1;", [id]);

      // Decrement applicant_count safely
      await client.query(
        "UPDATE jobs SET applicant_count = GREATEST(applicant_count - 1, 0) WHERE id = $1;",
        [jobId]
      );

      return (res.rowCount ?? 0) > 0;
    });
  }
}

export const applicationRepository = new ApplicationRepository();
