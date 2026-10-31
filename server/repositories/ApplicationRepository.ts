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
    recruiterNotes: row.recruiter_notes || row.notes || undefined,
    interviewScheduledAt: row.interview_scheduled_at
      ? new Date(row.interview_scheduled_at).toISOString()
      : undefined,
  };
}

export class ApplicationRepository implements IApplicationRepository {
  async getAll(candidateId?: string): Promise<ApplicationRecord[]> {
    let sql = "SELECT * FROM moas.applications";
    const params: any[] = [];

    if (candidateId) {
      params.push(candidateId);
      sql += " WHERE candidate_id = $1";
    }

    sql += " ORDER BY created_at DESC;";
    const res = await query(sql, params);
    return res.rows.map(mapRowToApplication);
  }

  async getForEmployer(
    employerUserId: string,
    jobId?: string,
    status?: string,
    search?: string
  ): Promise<ApplicationRecord[]> {
    let sql = `
      SELECT DISTINCT a.* 
      FROM moas.applications a
      JOIN moas.jobs j ON a.job_id = j.id
      LEFT JOIN moas.company_members cm ON j.company_id = cm.company_id AND cm.user_id = $1 AND (cm.is_verified = true OR cm.status = 'accepted')
      WHERE (cm.user_id IS NOT NULL OR j.posted_by = $1)
    `;
    const params: any[] = [employerUserId];

    if (jobId) {
      params.push(jobId);
      sql += ` AND a.job_id = $${params.length}`;
    }

    if (status && status !== "All") {
      params.push(status.toLowerCase());
      sql += ` AND LOWER(a.status) = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(a.candidate_name) LIKE $${params.length} OR LOWER(a.job_title) LIKE $${params.length} OR LOWER(a.candidate_email) LIKE $${params.length})`;
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
       LEFT JOIN moas.company_members cm ON j.company_id = cm.company_id AND cm.user_id = $2 AND (cm.is_verified = true OR cm.status = 'accepted')
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
       LEFT JOIN moas.company_members cm ON j.company_id = cm.company_id AND cm.user_id = $2 AND (cm.is_verified = true OR cm.status = 'accepted')
       WHERE a.candidate_id = $1 AND (cm.user_id IS NOT NULL OR j.posted_by = $2)
       LIMIT 1;`,
      [candidateUserId, employerUserId]
    );

    return res.rows.length > 0;
  }

  async getById(id: string): Promise<ApplicationRecord | null> {
    const res = await query("SELECT * FROM moas.applications WHERE id = $1 LIMIT 1;", [id]);
    if (res.rows.length === 0) return null;
    return mapRowToApplication(res.rows[0]);
  }

  async create(app: ApplicationRecord): Promise<ApplicationRecord> {
    return await withTransaction(async (client) => {
      // 1. Ensure candidate exists
      const userExists = await client.query("SELECT id FROM moas.users WHERE id = $1 LIMIT 1;", [app.candidateId]);
      if (userExists.rows.length === 0) {
        await client.query(
          `INSERT INTO moas.users (id, email, password_hash, role, name, email_verified)
          VALUES ($1, $2, 'scrypt:autogen', 'Candidate', $3, true)
          ON CONFLICT (email) DO NOTHING;`,
          [app.candidateId, app.candidateEmail || `${app.candidateId}@moas.ai`, app.candidateName || "Candidate"]
        );
      }

      // 2. Ensure job exists
      const jobExists = await client.query("SELECT id FROM moas.jobs WHERE id = $1 LIMIT 1;", [app.jobId]);
      if (jobExists.rows.length === 0) {
        await client.query(
          `INSERT INTO moas.jobs (id, title, company, status)
          VALUES ($1, $2, $3, 'open')
          ON CONFLICT (id) DO NOTHING;`,
          [app.jobId, app.jobTitle || "Job", app.company || "Company"]
        );
      }

      // 3. Insert Application
      const res = await client.query(
        `INSERT INTO moas.applications (
          id, job_id, job_title, company, candidate_id, candidate_name, candidate_email,
          applied_date, status, stage, match_score, resume_name, notes, recruiter_notes, interview_scheduled_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          stage = EXCLUDED.stage,
          notes = EXCLUDED.notes,
          recruiter_notes = COALESCE(EXCLUDED.recruiter_notes, applications.recruiter_notes),
          interview_scheduled_at = COALESCE(EXCLUDED.interview_scheduled_at, applications.interview_scheduled_at),
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
          app.recruiterNotes || app.notes || null,
          app.interviewScheduledAt || null,
        ]
      );

      // 4. Atomically increment applicant_count in jobs table
      await client.query(
        "UPDATE moas.jobs SET applicant_count = applicant_count + 1 WHERE id = $1;",
        [app.jobId]
      );

      return mapRowToApplication(res.rows[0]);
    });
  }

  async updateStatus(
    id: string,
    status: ApplicationRecord["status"],
    stage?: string
  ): Promise<ApplicationRecord | null> {
    const res = await query(
      `UPDATE moas.applications
      SET status = $2, stage = COALESCE($3, stage), updated_at = NOW()
      WHERE id = $1
      RETURNING *;`,
      [id, status, stage || null]
    );

    if (res.rows.length === 0) return null;
    return mapRowToApplication(res.rows[0]);
  }

  async updateRecruiterNotes(id: string, notes: string): Promise<ApplicationRecord | null> {
    const res = await query(
      `UPDATE moas.applications
       SET recruiter_notes = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [id, notes]
    );

    if (res.rows.length === 0) return null;
    return mapRowToApplication(res.rows[0]);
  }

  async scheduleInterview(
    id: string,
    scheduledAt: Date,
    stage = "Interview Scheduled"
  ): Promise<ApplicationRecord | null> {
    const res = await query(
      `UPDATE moas.applications
       SET interview_scheduled_at = $2,
           status = 'Interview Scheduled',
           stage = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [id, scheduledAt, stage]
    );

    if (res.rows.length === 0) return null;
    return mapRowToApplication(res.rows[0]);
  }

  async getEmployerStats(employerUserId: string) {
    // 1. Jobs statistics
    const jobStatsRes = await query(
      `SELECT 
         COUNT(*) as total_jobs,
         COUNT(*) FILTER (WHERE LOWER(j.status) IN ('open', 'published', 'active')) as active_jobs,
         COUNT(*) FILTER (WHERE LOWER(j.status) IN ('closed', 'archived')) as closed_jobs
       FROM moas.jobs j
       LEFT JOIN moas.company_members cm ON j.company_id = cm.company_id AND cm.user_id = $1 AND (cm.is_verified = true OR cm.status = 'accepted')
       WHERE (j.posted_by = $1 OR cm.user_id IS NOT NULL);`,
      [employerUserId]
    );

    // 2. Application counts by stage/status
    const appStatsRes = await query(
      `SELECT 
         COUNT(*) as total_apps,
         COUNT(*) FILTER (WHERE LOWER(a.status) = 'applied') as new_apps,
         COUNT(*) FILTER (WHERE LOWER(a.status) = 'under review') as under_review_apps,
         COUNT(*) FILTER (WHERE LOWER(a.status) = 'shortlisted') as shortlisted_apps,
         COUNT(*) FILTER (WHERE LOWER(a.status) IN ('interview', 'interview scheduled')) as interview_apps,
         COUNT(*) FILTER (WHERE LOWER(a.status) = 'offered') as offered_apps,
         COUNT(*) FILTER (WHERE LOWER(a.status) = 'hired') as hired_apps,
         COUNT(*) FILTER (WHERE LOWER(a.status) = 'rejected') as rejected_apps
       FROM moas.applications a
       JOIN moas.jobs j ON a.job_id = j.id
       LEFT JOIN moas.company_members cm ON j.company_id = cm.company_id AND cm.user_id = $1 AND (cm.is_verified = true OR cm.status = 'accepted')
       WHERE (j.posted_by = $1 OR cm.user_id IS NOT NULL);`,
      [employerUserId]
    );

    const jobRow = jobStatsRes.rows[0] || {};
    const appRow = appStatsRes.rows[0] || {};

    return {
      totalJobsPosted: parseInt(jobRow.total_jobs || "0", 10),
      activeJobOpenings: parseInt(jobRow.active_jobs || "0", 10),
      closedJobOpenings: parseInt(jobRow.closed_jobs || "0", 10),
      totalApplications: parseInt(appRow.total_apps || "0", 10),
      newApplications: parseInt(appRow.new_apps || "0", 10),
      underReviewApplications: parseInt(appRow.under_review_apps || "0", 10),
      shortlistedCandidates: parseInt(appRow.shortlisted_apps || "0", 10),
      interviewStageCandidates: parseInt(appRow.interview_apps || "0", 10),
      offeredCandidates: parseInt(appRow.offered_apps || "0", 10),
      hiredCandidates: parseInt(appRow.hired_apps || "0", 10),
      rejectedCandidates: parseInt(appRow.rejected_apps || "0", 10),
    };
  }

  async delete(id: string): Promise<boolean> {
    return await withTransaction(async (client) => {
      const existing = await client.query("SELECT job_id FROM moas.applications WHERE id = $1 LIMIT 1;", [id]);
      if (existing.rows.length === 0) {
        return false;
      }

      const jobId = existing.rows[0].job_id;
      const res = await client.query("DELETE FROM moas.applications WHERE id = $1;", [id]);

      // Decrement applicant_count safely
      await client.query(
        "UPDATE moas.jobs SET applicant_count = GREATEST(applicant_count - 1, 0) WHERE id = $1;",
        [jobId]
      );

      return (res.rowCount ?? 0) > 0;
    });
  }
}

export const applicationRepository = new ApplicationRepository();
