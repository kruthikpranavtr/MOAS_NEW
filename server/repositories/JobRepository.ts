import { IJobRepository } from "./IRepositories.js";
import { JobRecord } from "../models/types.js";
import { query } from "../db/postgresClient.js";

function mapRowToJob(row: any): JobRecord {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location || "",
    type: row.type || "Full-time",
    experience: row.experience || "Entry",
    salary: row.salary || "",
    salaryText: row.salary_text || row.salary || "",
    description: row.description || "",
    requirements: Array.isArray(row.requirements)
      ? row.requirements
      : typeof row.requirements === "string"
        ? JSON.parse(row.requirements || "[]")
        : [],
    department: row.department || "Engineering",
    tags: Array.isArray(row.tags)
      ? row.tags
      : typeof row.tags === "string"
        ? JSON.parse(row.tags || "[]")
        : [],
    isVerified: row.is_verified ?? true,
    postedDate: row.posted_date || "Recently",
    status: row.status || "open",
    workMode: row.work_mode || "Hybrid",
    logoUrl: row.logo_url || undefined,
    logo: row.logo_url || undefined,
    applicantCount: parseInt(row.applicant_count || "0", 10),
    isFeatured: row.is_featured ?? false,
    employerId: row.posted_by || undefined,
    companyId: row.company_id || undefined,
  };
}

export class JobRepository implements IJobRepository {
  async getAll(
    search?: string,
    department?: string,
    location?: string,
    status?: string
  ): Promise<JobRecord[]> {
    let sql = "SELECT * FROM moas.jobs WHERE 1=1";
    const params: any[] = [];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(company) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`;
    }

    if (department && department !== "All") {
      params.push(department.toLowerCase());
      sql += ` AND LOWER(department) = $${params.length}`;
    }

    if (location && location !== "All") {
      params.push(`%${location.toLowerCase()}%`);
      sql += ` AND LOWER(location) LIKE $${params.length}`;
    }

    if (status && status !== "All") {
      params.push(status.toLowerCase());
      sql += ` AND LOWER(status) = $${params.length}`;
    }

    sql += " ORDER BY created_at DESC;";
    const res = await query(sql, params);
    return res.rows.map(mapRowToJob);
  }

  async getById(id: string): Promise<JobRecord | null> {
    const res = await query("SELECT * FROM moas.jobs WHERE id = $1 LIMIT 1;", [id]);
    if (res.rows.length === 0) return null;
    return mapRowToJob(res.rows[0]);
  }

  async getByEmployer(
    employerId: string,
    status?: string,
    search?: string
  ): Promise<JobRecord[]> {
    let sql = `
      SELECT DISTINCT j.*
      FROM moas.jobs j
      LEFT JOIN moas.company_members cm ON j.company_id = cm.company_id AND cm.user_id = $1 AND cm.is_verified = true
      WHERE (j.posted_by = $1 OR cm.user_id IS NOT NULL)
    `;
    const params: any[] = [employerId];

    if (status && status !== "All") {
      params.push(status.toLowerCase());
      sql += ` AND LOWER(j.status) = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(j.title) LIKE $${params.length} OR LOWER(j.description) LIKE $${params.length})`;
    }

    sql += " ORDER BY j.created_at DESC;";
    const res = await query(sql, params);
    return res.rows.map(mapRowToJob);
  }

  async getByCompany(companyId: string, status?: string): Promise<JobRecord[]> {
    let sql = "SELECT * FROM moas.jobs WHERE company_id = $1";
    const params: any[] = [companyId];

    if (status && status !== "All") {
      params.push(status.toLowerCase());
      sql += ` AND LOWER(status) = $${params.length}`;
    }

    sql += " ORDER BY created_at DESC;";
    const res = await query(sql, params);
    return res.rows.map(mapRowToJob);
  }

  async save(job: JobRecord): Promise<JobRecord> {
    const requirementsJson = JSON.stringify(job.requirements || []);
    const tagsJson = JSON.stringify(job.tags || []);
    const logo = job.logoUrl || job.logo || null;
    const status = job.status || "open";

    const res = await query(
      `INSERT INTO moas.jobs (
        id, title, company, company_id, location, type, experience, salary, salary_text,
        description, requirements, department, tags, is_verified, posted_date,
        work_mode, applicant_count, logo_url, is_featured, posted_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        company = EXCLUDED.company,
        company_id = COALESCE(EXCLUDED.company_id, jobs.company_id),
        location = EXCLUDED.location,
        type = EXCLUDED.type,
        experience = EXCLUDED.experience,
        salary = EXCLUDED.salary,
        salary_text = EXCLUDED.salary_text,
        description = EXCLUDED.description,
        requirements = EXCLUDED.requirements,
        department = EXCLUDED.department,
        tags = EXCLUDED.tags,
        is_verified = EXCLUDED.is_verified,
        posted_date = EXCLUDED.posted_date,
        work_mode = EXCLUDED.work_mode,
        applicant_count = EXCLUDED.applicant_count,
        logo_url = EXCLUDED.logo_url,
        is_featured = EXCLUDED.is_featured,
        posted_by = COALESCE(EXCLUDED.posted_by, jobs.posted_by),
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *;`,
      [
        job.id,
        job.title,
        job.company,
        job.companyId || null,
        job.location || null,
        job.type || null,
        job.experience || null,
        job.salary || null,
        job.salaryText || null,
        job.description || null,
        requirementsJson,
        job.department || null,
        tagsJson,
        job.isVerified ?? true,
        job.postedDate || "Just now",
        job.workMode || null,
        job.applicantCount || 0,
        logo,
        job.isFeatured ?? false,
        job.employerId || null,
        status,
      ]
    );

    return mapRowToJob(res.rows[0]);
  }

  async updateStatus(id: string, status: string): Promise<JobRecord | null> {
    const res = await query(
      `UPDATE moas.jobs SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *;`,
      [id, status]
    );
    if (res.rows.length === 0) return null;
    return mapRowToJob(res.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const res = await query("DELETE FROM moas.jobs WHERE id = $1;", [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const jobRepository = new JobRepository();
