import { IJobRepository } from "./IRepositories.js";
import { JobRecord, JobSearchParams, JobSearchResult } from "../models/types.js";
import { query } from "../db/postgresClient.js";

function parseJsonArray(val: any): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function mapRowToJob(row: any): JobRecord {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    companyId: row.company_id || undefined,
    location: row.location || "",
    type: row.type || "Full-time",
    employmentType: row.type || "Full-time",
    experience: row.experience || "Entry",
    salary: row.salary || "",
    salaryText: row.salary_text || row.salary || "",
    salaryMin: row.salary_min !== null && row.salary_min !== undefined ? parseFloat(row.salary_min) : undefined,
    salaryMax: row.salary_max !== null && row.salary_max !== undefined ? parseFloat(row.salary_max) : undefined,
    salaryCurrency: row.salary_currency || "USD",
    salaryPeriod: row.salary_period || "yearly",
    description: row.description || "",
    responsibilities: parseJsonArray(row.responsibilities),
    qualifications: parseJsonArray(row.qualifications),
    skills: parseJsonArray(row.skills),
    preferredSkills: parseJsonArray(row.preferred_skills),
    requirements: parseJsonArray(row.requirements),
    benefits: parseJsonArray(row.benefits),
    department: row.department || "Engineering",
    category: row.category || row.department || "Engineering",
    tags: parseJsonArray(row.tags),
    isVerified: row.company_verified ?? (row.company_verification_status === "verified" || row.is_verified === true),
    companyVerified: row.company_verified ?? (row.company_verification_status === "verified" || row.is_verified === true),
    companyVerificationStatus: row.company_verification_status || (row.is_verified ? "verified" : "pending"),
    postedDate: row.posted_date || "Recently",
    status: row.status || "open",
    workMode: row.work_mode || "Hybrid",
    logoUrl: row.logo_url || undefined,
    logo: row.logo_url || undefined,
    applicantCount: parseInt(row.applicant_count || "0", 10),
    openingsCount: parseInt(row.openings_count || "1", 10),
    isFeatured: row.is_featured ?? false,
    employerId: row.posted_by || undefined,
    applicationDeadline: row.application_deadline ? new Date(row.application_deadline).toISOString() : undefined,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : undefined,
    archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
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
      sql += ` AND (LOWER(COALESCE(category, department)) = $${params.length})`;
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

  async searchJobs(params: JobSearchParams): Promise<JobSearchResult> {
    const queryParams: any[] = [];
    let whereClauses: string[] = ["1=1"];

    // 1. Text Search (Full-Text Search with ILIKE Fallback)
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      queryParams.push(q);
      const ftsIndex = queryParams.length;

      queryParams.push(`%${q.toLowerCase()}%`);
      const likeIndex = queryParams.length;

      whereClauses.push(`(
        j.fts @@ plainto_tsquery('english', $${ftsIndex})
        OR LOWER(j.title) LIKE $${likeIndex}
        OR LOWER(j.company) LIKE $${likeIndex}
        OR LOWER(j.description) LIKE $${likeIndex}
        OR LOWER(COALESCE(j.category, '')) LIKE $${likeIndex}
        OR LOWER(COALESCE(j.location, '')) LIKE $${likeIndex}
        OR LOWER(COALESCE(j.skills::text, '')) LIKE $${likeIndex}
        OR LOWER(COALESCE(j.tags::text, '')) LIKE $${likeIndex}
        OR LOWER(COALESCE(j.requirements::text, '')) LIKE $${likeIndex}
      )`);
    }

    // 2. Category / Department Filter
    if (params.category && params.category !== "All" && params.category !== "All Categories") {
      queryParams.push(params.category.toLowerCase());
      whereClauses.push(`(LOWER(COALESCE(j.category, j.department, '')) = $${queryParams.length} OR LOWER(COALESCE(j.department, '')) = $${queryParams.length})`);
    } else if (params.department && params.department !== "All") {
      queryParams.push(params.department.toLowerCase());
      whereClauses.push(`(LOWER(COALESCE(j.category, j.department, '')) = $${queryParams.length} OR LOWER(COALESCE(j.department, '')) = $${queryParams.length})`);
    }

    // 3. Location Filter
    if (params.location && params.location !== "All" && params.location !== "All Locations") {
      queryParams.push(`%${params.location.toLowerCase()}%`);
      whereClauses.push(`LOWER(j.location) LIKE $${queryParams.length}`);
    }

    // 4. Work Mode Filter (Remote, Hybrid, On-site)
    if (params.workMode && params.workMode !== "All") {
      queryParams.push(params.workMode.toLowerCase());
      whereClauses.push(`LOWER(COALESCE(j.work_mode, '')) = $${queryParams.length}`);
    }

    // 5. Employment Type Filter
    const rawType = params.employmentType || params.type;
    if (rawType && rawType !== "All" && rawType !== "All Job Types") {
      queryParams.push(`%${rawType.toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(j.type, '')) LIKE $${queryParams.length}`);
    }

    // 6. Experience Level Filter
    if (params.experience && params.experience !== "All") {
      queryParams.push(`%${params.experience.toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(j.experience, '')) LIKE $${queryParams.length}`);
    }

    // 7. Salary Filtering
    if (params.salaryMin !== undefined && params.salaryMin !== null && !isNaN(params.salaryMin)) {
      queryParams.push(Number(params.salaryMin));
      whereClauses.push(`(COALESCE(j.salary_max, j.salary_min, 0) >= $${queryParams.length})`);
    }
    if (params.salaryMax !== undefined && params.salaryMax !== null && !isNaN(params.salaryMax)) {
      queryParams.push(Number(params.salaryMax));
      whereClauses.push(`(COALESCE(j.salary_min, j.salary_max, 0) <= $${queryParams.length})`);
    }

    // 8. Skills Filtering
    if (params.skills && params.skills.length > 0) {
      const lowerSkills = params.skills.map((s) => s.toLowerCase());
      queryParams.push(lowerSkills);
      whereClauses.push(`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(COALESCE(j.skills, j.tags, '[]'::jsonb)) elem 
        WHERE LOWER(elem) = ANY($${queryParams.length})
      )`);
    }

    // 9. Verified Employer Filter
    if (params.isVerified === true || params.verifiedOnly === true) {
      whereClauses.push(`c.verification_status = 'verified'`);
    }

    // 10. Featured Filter
    if (params.isFeatured !== undefined) {
      queryParams.push(params.isFeatured);
      whereClauses.push(`j.is_featured = $${queryParams.length}`);
    }

    // 11. Company ID Filter
    if (params.companyId) {
      queryParams.push(params.companyId);
      whereClauses.push(`j.company_id = $${queryParams.length}`);
    }

    // 12. Employer ID Filter
    if (params.employerId) {
      queryParams.push(params.employerId);
      whereClauses.push(`j.posted_by = $${queryParams.length}`);
    }

    // 13. Posting Date Filter
    if (params.datePosted && params.datePosted !== "Anytime" && params.datePosted !== "All") {
      const dp = params.datePosted.toLowerCase();
      if (dp.includes("24h") || dp.includes("today") || dp.includes("day")) {
        whereClauses.push(`j.created_at >= NOW() - INTERVAL '24 hours'`);
      } else if (dp.includes("week") || dp.includes("7")) {
        whereClauses.push(`j.created_at >= NOW() - INTERVAL '7 days'`);
      } else if (dp.includes("month") || dp.includes("30")) {
        whereClauses.push(`j.created_at >= NOW() - INTERVAL '30 days'`);
      }
    }

    // 14. Status and Lifecycle Filtering (Task 3 & 13)
    // Public queries must NOT expose draft, closed, archived, or suspended jobs
    if (params.status && params.status !== "All") {
      queryParams.push(params.status.toLowerCase());
      whereClauses.push(`LOWER(j.status) = $${queryParams.length}`);
    } else if (!params.employerId && params.callerRole !== "admin") {
      // Public candidate discovery: only active/open/published jobs
      whereClauses.push(`j.status IN ('open', 'published', 'active')`);
    }

    // Sorting
    let orderBy = "j.created_at DESC";
    const sort = (params.sortBy || "").toLowerCase();
    if (sort === "relevance" && params.search && params.search.trim()) {
      orderBy = `ts_rank(j.fts, plainto_tsquery('english', $1)) DESC, j.created_at DESC`;
    } else if (sort === "newest" || sort === "most recent") {
      orderBy = "j.created_at DESC";
    } else if (sort === "oldest") {
      orderBy = "j.created_at ASC";
    } else if (sort === "salary_high" || sort === "highest salary") {
      orderBy = "COALESCE(j.salary_max, j.salary_min, 0) DESC, j.created_at DESC";
    } else if (sort === "salary_low" || sort === "lowest salary") {
      orderBy = "COALESCE(j.salary_min, j.salary_max, 0) ASC, j.created_at DESC";
    } else if (sort === "company_asc" || sort === "company alphabetical") {
      orderBy = "j.company ASC, j.created_at DESC";
    }

    // Pagination
    const page = Math.max(1, params.page ? Number(params.page) : 1);
    const limit = Math.min(100, Math.max(1, params.limit ? Number(params.limit) : 10));
    const offset = (page - 1) * limit;

    queryParams.push(limit);
    const limitIndex = queryParams.length;
    queryParams.push(offset);
    const offsetIndex = queryParams.length;

    const sql = `
      SELECT 
        j.*,
        c.name as verified_company_name,
        c.verification_status as company_verification_status,
        c.verified as company_verified,
        c.logo_url as company_logo_url,
        COUNT(*) OVER() as full_count
      FROM moas.jobs j
      LEFT JOIN moas.companies c ON j.company_id = c.id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT $${limitIndex} OFFSET $${offsetIndex};
    `;

    const res = await query(sql, queryParams);
    const total = res.rows.length > 0 ? parseInt(res.rows[0].full_count, 10) : 0;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
    const jobs = res.rows.map(mapRowToJob);

    return {
      jobs,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getById(id: string): Promise<JobRecord | null> {
    const res = await query(
      `SELECT j.*, c.verification_status as company_verification_status, c.verified as company_verified
       FROM moas.jobs j 
       LEFT JOIN moas.companies c ON j.company_id = c.id 
       WHERE j.id = $1 LIMIT 1;`,
      [id]
    );
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

  async getCategoryCounts(): Promise<Array<{ category: string; count: number }>> {
    const res = await query(`
      SELECT 
        COALESCE(category, department, 'Engineering') as category,
        COUNT(*)::int as count
      FROM moas.jobs
      WHERE status IN ('open', 'published', 'active')
      GROUP BY 1
      ORDER BY count DESC;
    `);
    return res.rows.map((r: any) => ({
      category: r.category,
      count: parseInt(r.count, 10),
    }));
  }

  async save(job: JobRecord): Promise<JobRecord> {
    const requirementsJson = JSON.stringify(job.requirements || []);
    const responsibilitiesJson = JSON.stringify(job.responsibilities || []);
    const qualificationsJson = JSON.stringify(job.qualifications || []);
    const skillsJson = JSON.stringify(job.skills || []);
    const preferredSkillsJson = JSON.stringify(job.preferredSkills || []);
    const benefitsJson = JSON.stringify(job.benefits || []);
    const tagsJson = JSON.stringify(job.tags || []);
    const logo = job.logoUrl || job.logo || null;
    const status = (job.status || "open").toLowerCase();
    const category = job.category || job.department || "Engineering";
    const department = job.department || job.category || "Engineering";

    let publishedAt: Date | null = null;
    if (status === "published" || status === "open" || status === "active") {
      publishedAt = job.publishedAt ? new Date(job.publishedAt) : new Date();
    }
    const closedAt = status === "closed" ? (job.closedAt ? new Date(job.closedAt) : new Date()) : null;
    const archivedAt = status === "archived" ? (job.archivedAt ? new Date(job.archivedAt) : new Date()) : null;

    const res = await query(
      `INSERT INTO moas.jobs (
        id, title, company, company_id, location, type, experience, salary, salary_text,
        salary_min, salary_max, salary_currency, salary_period,
        description, responsibilities, qualifications, requirements, skills, preferred_skills,
        department, category, tags, is_verified, posted_date,
        work_mode, applicant_count, openings_count, benefits, logo_url, is_featured, posted_by, status,
        application_deadline, published_at, closed_at, archived_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29, $30, $31, $32,
        $33, $34, $35, $36, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        company = EXCLUDED.company,
        company_id = COALESCE(EXCLUDED.company_id, moas.jobs.company_id),
        location = EXCLUDED.location,
        type = EXCLUDED.type,
        experience = EXCLUDED.experience,
        salary = EXCLUDED.salary,
        salary_text = EXCLUDED.salary_text,
        salary_min = EXCLUDED.salary_min,
        salary_max = EXCLUDED.salary_max,
        salary_currency = EXCLUDED.salary_currency,
        salary_period = EXCLUDED.salary_period,
        description = EXCLUDED.description,
        responsibilities = EXCLUDED.responsibilities,
        qualifications = EXCLUDED.qualifications,
        requirements = EXCLUDED.requirements,
        skills = EXCLUDED.skills,
        preferred_skills = EXCLUDED.preferred_skills,
        department = EXCLUDED.department,
        category = EXCLUDED.category,
        tags = EXCLUDED.tags,
        is_verified = EXCLUDED.is_verified,
        posted_date = EXCLUDED.posted_date,
        work_mode = EXCLUDED.work_mode,
        applicant_count = EXCLUDED.applicant_count,
        openings_count = EXCLUDED.openings_count,
        benefits = EXCLUDED.benefits,
        logo_url = EXCLUDED.logo_url,
        is_featured = EXCLUDED.is_featured,
        posted_by = COALESCE(EXCLUDED.posted_by, moas.jobs.posted_by),
        status = EXCLUDED.status,
        application_deadline = EXCLUDED.application_deadline,
        published_at = COALESCE(EXCLUDED.published_at, moas.jobs.published_at),
        closed_at = EXCLUDED.closed_at,
        archived_at = EXCLUDED.archived_at,
        updated_at = NOW()
      RETURNING *;`,
      [
        job.id,
        job.title,
        job.company,
        job.companyId || null,
        job.location || null,
        job.type || "Full-time",
        job.experience || "Entry",
        job.salary || null,
        job.salaryText || null,
        job.salaryMin !== undefined ? job.salaryMin : null,
        job.salaryMax !== undefined ? job.salaryMax : null,
        job.salaryCurrency || "USD",
        job.salaryPeriod || "yearly",
        job.description || "",
        responsibilitiesJson,
        qualificationsJson,
        requirementsJson,
        skillsJson,
        preferredSkillsJson,
        department,
        category,
        tagsJson,
        job.isVerified ?? true,
        job.postedDate || "Just now",
        job.workMode || "Hybrid",
        job.applicantCount || 0,
        job.openingsCount || 1,
        benefitsJson,
        logo,
        job.isFeatured ?? false,
        job.employerId || null,
        status,
        job.applicationDeadline ? new Date(job.applicationDeadline) : null,
        publishedAt,
        closedAt,
        archivedAt,
      ]
    );

    return mapRowToJob(res.rows[0]);
  }

  async updateStatus(id: string, status: string): Promise<JobRecord | null> {
    const s = status.toLowerCase();
    const publishedAtClause = s === "published" || s === "open" || s === "active" ? ", published_at = COALESCE(published_at, NOW())" : "";
    const closedAtClause = s === "closed" ? ", closed_at = NOW()" : "";
    const archivedAtClause = s === "archived" ? ", archived_at = NOW()" : "";

    const res = await query(
      `UPDATE moas.jobs 
       SET status = $2, updated_at = NOW() ${publishedAtClause} ${closedAtClause} ${archivedAtClause}
       WHERE id = $1 RETURNING *;`,
      [id, s]
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
