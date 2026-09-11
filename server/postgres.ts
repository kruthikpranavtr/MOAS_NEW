import { PGlite } from "@electric-sql/pglite";
import path from "path";
import fs from "fs";
import {
  DBJob,
  DBApplication,
  DBUser,
  DBResume,
  DBCompany,
  DBCompanyRating,
  DBSavedJob,
  DBJobAlert,
  DBProfileView,
} from "./db.js";

let pgInstance: PGlite | null = null;
let isInitialized = false;
let initPromise: Promise<PGlite> | null = null;

// Initialize PostgreSQL engine with local data persistence
export async function getPostgres(): Promise<PGlite> {
  if (pgInstance && isInitialized) {
    return pgInstance;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const dataDir = path.join(process.cwd(), ".postgres_data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Initialize PGlite (PostgreSQL 18.x WASM Engine) with filesystem storage
      pgInstance = new PGlite(dataDir);
      await initSchema(pgInstance);
      isInitialized = true;
      console.log("[PostgreSQL] Embedded PostgreSQL engine successfully initialized.");
      return pgInstance;
    } catch (err) {
      console.warn("[PostgreSQL] Filesystem init fallback to in-memory instance:", err);
      pgInstance = new PGlite();
      await initSchema(pgInstance);
      isInitialized = true;
      return pgInstance;
    }
  })();

  return initPromise;
}

// Create all relational tables, primary keys, and indexes
async function initSchema(pg: PGlite) {
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id VARCHAR(128) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      type VARCHAR(100),
      experience VARCHAR(100),
      salary VARCHAR(100),
      salary_text VARCHAR(100),
      description TEXT,
      requirements JSONB DEFAULT '[]'::jsonb,
      department VARCHAR(100),
      tags JSONB DEFAULT '[]'::jsonb,
      is_verified BOOLEAN DEFAULT true,
      posted_date VARCHAR(100),
      work_mode VARCHAR(50),
      logo_url TEXT,
      applicant_count INT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS applications (
      id VARCHAR(128) PRIMARY KEY,
      job_id VARCHAR(128) NOT NULL,
      job_title VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      candidate_id VARCHAR(128) NOT NULL,
      candidate_name VARCHAR(255) NOT NULL,
      candidate_email VARCHAR(255),
      applied_date VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Applied',
      stage VARCHAR(100) DEFAULT 'Initial Screening',
      match_score INT DEFAULT 85,
      resume_name VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(128) PRIMARY KEY,
      username VARCHAR(100),
      password VARCHAR(255),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(100),
      role VARCHAR(50) DEFAULT 'Candidate',
      company_name VARCHAR(255),
      company_email VARCHAR(255),
      industry VARCHAR(100),
      company_size VARCHAR(100),
      contact_person VARCHAR(255),
      company_website TEXT,
      avatar_url TEXT,
      location VARCHAR(255),
      quote TEXT,
      about_me TEXT,
      skills JSONB DEFAULT '[]'::jsonb,
      experience_level VARCHAR(100),
      education JSONB DEFAULT '[]'::jsonb,
      resumes JSONB DEFAULT '[]'::jsonb,
      created_at VARCHAR(100),
      updated_at VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS companies (
      id VARCHAR(128) PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      industry VARCHAR(100),
      location VARCHAR(255),
      open_jobs_count INT DEFAULT 0,
      rating NUMERIC(3,2) DEFAULT 4.5,
      reviews_count VARCHAR(50) DEFAULT '0',
      verified BOOLEAN DEFAULT true,
      logo_url TEXT,
      culture_rating NUMERIC(3,2),
      work_life_rating NUMERIC(3,2),
      growth_rating NUMERIC(3,2),
      compensation_rating NUMERIC(3,2),
      featured_review TEXT,
      tagline TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS company_ratings (
      id VARCHAR(128) PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL,
      user_id VARCHAR(128) NOT NULL,
      user_name VARCHAR(255) NOT NULL,
      user_role VARCHAR(100),
      user_avatar TEXT,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      culture_rating INT,
      work_life_rating INT,
      growth_rating INT,
      compensation_rating INT,
      review_title VARCHAR(255),
      review_text TEXT,
      pros TEXT,
      cons TEXT,
      recommend_to_friend BOOLEAN DEFAULT true,
      created_at VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS saved_jobs (
      id VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      job_id VARCHAR(128) NOT NULL,
      saved_date VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS job_alerts (
      id VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      keyword VARCHAR(255),
      location VARCHAR(255),
      role VARCHAR(255),
      frequency VARCHAR(50) DEFAULT 'Weekly',
      active BOOLEAN DEFAULT true,
      created_at VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS profile_views (
      id VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      viewer_type VARCHAR(100),
      viewer_name VARCHAR(255) NOT NULL,
      viewer_company VARCHAR(255) NOT NULL,
      viewer_role VARCHAR(255),
      viewer_avatar TEXT,
      source VARCHAR(255),
      viewed_at VARCHAR(100),
      duration_seconds INT DEFAULT 60,
      job_id VARCHAR(128),
      job_title VARCHAR(255),
      is_verified_recruiter BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
    CREATE INDEX IF NOT EXISTS idx_jobs_department ON jobs(department);
    CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
    CREATE INDEX IF NOT EXISTS idx_profile_views_user ON profile_views(user_id);
  `);
}

// Execute arbitrary SQL safely with parameter support
export async function queryPostgres(sql: string, params: any[] = []): Promise<any> {
  const pg = await getPostgres();
  return await pg.query(sql, params);
}

// Get PostgreSQL Status & Statistics
export async function getPostgresStatus() {
  try {
    const pg = await getPostgres();
    const versionRes = await pg.query<{ version: string }>("SELECT version();");
    const counts = await pg.query<{
      jobs_count: string | number;
      apps_count: string | number;
      users_count: string | number;
      companies_count: string | number;
      views_count: string | number;
      ratings_count: string | number;
    }>(`
      SELECT 
        (SELECT COUNT(*) FROM jobs) AS jobs_count,
        (SELECT COUNT(*) FROM applications) AS apps_count,
        (SELECT COUNT(*) FROM users) AS users_count,
        (SELECT COUNT(*) FROM companies) AS companies_count,
        (SELECT COUNT(*) FROM profile_views) AS views_count,
        (SELECT COUNT(*) FROM company_ratings) AS ratings_count
    `);

    const row = counts.rows[0] || {} as any;

    return {
      connected: true,
      engine: "PostgreSQL",
      version: versionRes.rows[0]?.version || "PostgreSQL 18.x",
      dialect: "postgres",
      tables: {
        jobs: Number(row.jobs_count || 0),
        applications: Number(row.apps_count || 0),
        users: Number(row.users_count || 0),
        companies: Number(row.companies_count || 0),
        profileViews: Number(row.views_count || 0),
        companyRatings: Number(row.ratings_count || 0),
      },
    };
  } catch (error: any) {
    return {
      connected: false,
      engine: "PostgreSQL",
      error: error.message,
    };
  }
}

// ----------------------------------------------------
// Relational CRUD Operations syncing with PostgreSQL
// ----------------------------------------------------

export async function pgUpsertJob(job: DBJob) {
  const pg = await getPostgres();
  await pg.query(
    `
    INSERT INTO jobs (
      id, title, company, location, type, experience, salary, salary_text,
      description, requirements, department, tags, is_verified, posted_date,
      work_mode, logo_url, applicant_count
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      company = EXCLUDED.company,
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
      logo_url = EXCLUDED.logo_url,
      applicant_count = EXCLUDED.applicant_count;
  `,
    [
      job.id,
      job.title,
      job.company,
      job.location || "Remote",
      job.type || "Full-time",
      job.experience || "1-3 years",
      job.salary || "Competitive",
      job.salaryText || job.salary || "Competitive",
      job.description || "",
      JSON.stringify(job.requirements || []),
      job.department || "Engineering",
      JSON.stringify(job.tags || []),
      job.isVerified ?? true,
      job.postedDate || "Just now",
      job.workMode || "Hybrid",
      job.logoUrl || "",
      job.applicantCount || 0,
    ]
  );
}

export async function pgDeleteJob(jobId: string) {
  const pg = await getPostgres();
  await pg.query("DELETE FROM jobs WHERE id = $1", [jobId]);
}

export async function pgUpsertApplication(app: DBApplication) {
  const pg = await getPostgres();
  await pg.query(
    `
    INSERT INTO applications (
      id, job_id, job_title, company, candidate_id, candidate_name, candidate_email,
      applied_date, status, stage, match_score, resume_name, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      stage = EXCLUDED.stage,
      match_score = EXCLUDED.match_score,
      notes = EXCLUDED.notes;
  `,
    [
      app.id,
      app.jobId,
      app.jobTitle,
      app.company,
      app.candidateId,
      app.candidateName,
      app.candidateEmail || "",
      app.appliedDate || new Date().toISOString(),
      app.status || "Applied",
      app.stage || "Initial Screening",
      app.matchScore || 85,
      app.resumeName || "Resume.pdf",
      app.notes || "",
    ]
  );
}

export async function pgUpdateApplicationStatus(id: string, status: string, stage?: string) {
  const pg = await getPostgres();
  await pg.query(
    `UPDATE applications SET status = $1, stage = COALESCE($2, stage) WHERE id = $3`,
    [status, stage || null, id]
  );
}

export async function pgUpsertUser(user: DBUser) {
  const pg = await getPostgres();
  await pg.query(
    `
    INSERT INTO users (
      id, username, password, name, email, phone, role, company_name, company_email,
      industry, company_size, contact_person, company_website, avatar_url, location,
      quote, about_me, skills, experience_level, education, resumes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role,
      company_name = EXCLUDED.company_name,
      avatar_url = EXCLUDED.avatar_url,
      location = EXCLUDED.location,
      skills = EXCLUDED.skills,
      about_me = EXCLUDED.about_me,
      updated_at = EXCLUDED.updated_at;
  `,
    [
      user.id,
      user.username || "",
      user.password || "",
      user.name,
      user.email,
      user.phone || "",
      user.role || "Candidate",
      user.companyName || "",
      user.companyEmail || "",
      user.industry || "",
      user.companySize || "",
      user.contactPerson || "",
      user.companyWebsite || "",
      user.avatarUrl || "",
      user.location || "",
      user.quote || "",
      user.aboutMe || "",
      JSON.stringify(user.skills || []),
      user.experienceLevel || "",
      JSON.stringify(user.education || []),
      JSON.stringify(user.resumes || []),
      user.createdAt || new Date().toISOString(),
      user.updatedAt || new Date().toISOString(),
    ]
  );
}

export async function pgRecordProfileView(view: DBProfileView) {
  const pg = await getPostgres();
  await pg.query(
    `
    INSERT INTO profile_views (
      id, user_id, viewer_type, viewer_name, viewer_company, viewer_role,
      viewer_avatar, source, viewed_at, duration_seconds, job_id, job_title, is_verified_recruiter
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (id) DO NOTHING;
  `,
    [
      view.id,
      view.userId,
      view.viewerType || "Recruiter",
      view.viewerName,
      view.viewerCompany,
      view.viewerRole || "Talent Acquisition",
      view.viewerAvatar || "",
      view.source || "MOAS Direct Recruiter Discovery",
      view.viewedAt || new Date().toISOString(),
      view.durationSeconds || 60,
      view.jobId || "",
      view.jobTitle || "",
      view.isVerifiedRecruiter ?? true,
    ]
  );
}

export async function pgGetProfileViews(userId?: string): Promise<DBProfileView[]> {
  const pg = await getPostgres();
  let res;
  if (userId) {
    res = await pg.query(
      `SELECT * FROM profile_views WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
  } else {
    res = await pg.query(`SELECT * FROM profile_views ORDER BY created_at DESC LIMIT 50`);
  }

  return res.rows.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    viewerType: row.viewer_type,
    viewerName: row.viewer_name,
    viewerCompany: row.viewer_company,
    viewerRole: row.viewer_role,
    viewerAvatar: row.viewer_avatar,
    source: row.source,
    viewedAt: row.viewed_at,
    durationSeconds: row.duration_seconds,
    jobId: row.job_id,
    jobTitle: row.job_title,
    isVerifiedRecruiter: row.is_verified_recruiter,
  }));
}

export async function pgClearProfileViews(userId?: string) {
  const pg = await getPostgres();
  if (userId) {
    await pg.query("DELETE FROM profile_views WHERE user_id = $1", [userId]);
  } else {
    await pg.query("DELETE FROM profile_views");
  }
}

export async function pgUpsertCompany(company: DBCompany) {
  const pg = await getPostgres();
  await pg.query(
    `
    INSERT INTO companies (
      id, name, industry, location, open_jobs_count, rating, reviews_count,
      verified, logo_url, culture_rating, work_life_rating, growth_rating, compensation_rating,
      featured_review, tagline
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (name) DO UPDATE SET
      industry = EXCLUDED.industry,
      location = EXCLUDED.location,
      open_jobs_count = EXCLUDED.open_jobs_count,
      rating = EXCLUDED.rating,
      reviews_count = EXCLUDED.reviews_count,
      logo_url = EXCLUDED.logo_url;
  `,
    [
      company.id,
      company.name,
      company.industry || "Artificial Intelligence",
      company.location || "San Francisco, CA",
      company.openJobsCount || 0,
      company.rating || 4.5,
      company.reviewsCount || "10+",
      company.verified ?? true,
      company.logoUrl || "",
      company.cultureRating || 4.8,
      company.workLifeRating || 4.6,
      company.growthRating || 4.9,
      company.compensationRating || 4.7,
      company.featuredReview || "",
      company.tagline || "",
    ]
  );
}

export async function pgSaveRating(rating: DBCompanyRating) {
  const pg = await getPostgres();
  await pg.query(
    `
    INSERT INTO company_ratings (
      id, company_name, user_id, user_name, user_role, user_avatar, rating,
      culture_rating, work_life_rating, growth_rating, compensation_rating,
      review_title, review_text, pros, cons, recommend_to_friend, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    ON CONFLICT (id) DO NOTHING;
  `,
    [
      rating.id,
      rating.companyName,
      rating.userId,
      rating.userName,
      rating.userRole || "",
      rating.userAvatar || "",
      rating.rating,
      rating.cultureRating || rating.rating,
      rating.workLifeRating || rating.rating,
      rating.growthRating || rating.rating,
      rating.compensationRating || rating.rating,
      rating.reviewTitle,
      rating.reviewText,
      rating.pros || "",
      rating.cons || "",
      rating.recommendToFriend ?? true,
      rating.createdAt,
    ]
  );
}
