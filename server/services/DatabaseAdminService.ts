import { checkDbHealth, query } from "../db/postgresClient.js";
import { runSeeds } from "../db/seeds.js";
import { migrator } from "../db/migrator.js";

const ALLOWED_ADMIN_TABLES = [
  "jobs",
  "applications",
  "users",
  "companies",
  "profile_views",
  "company_ratings",
  "saved_jobs",
  "job_alerts",
  "sessions",
  "schema_migrations",
];

export class DatabaseAdminService {
  async getStatus() {
    const health = await checkDbHealth();
    const migrationStatus = await migrator.getStatus().catch(() => ({ applied: [], pending: [], isUpToDate: false }));

    let counts: Record<string, number> = {};
    if (health.status === "connected") {
      try {
        const countsRes = await query(`
          SELECT
            (SELECT COUNT(*) FROM users) as users,
            (SELECT COUNT(*) FROM jobs) as jobs,
            (SELECT COUNT(*) FROM applications) as applications,
            (SELECT COUNT(*) FROM companies) as companies,
            (SELECT COUNT(*) FROM company_ratings) as ratings,
            (SELECT COUNT(*) FROM saved_jobs) as saved_jobs,
            (SELECT COUNT(*) FROM job_alerts) as alerts,
            (SELECT COUNT(*) FROM profile_views) as profile_views;
        `);
        if (countsRes.rows.length > 0) {
          const row = countsRes.rows[0];
          counts = {
            users: parseInt(row.users || "0", 10),
            jobs: parseInt(row.jobs || "0", 10),
            applications: parseInt(row.applications || "0", 10),
            companies: parseInt(row.companies || "0", 10),
            ratings: parseInt(row.ratings || "0", 10),
            savedJobs: parseInt(row.saved_jobs || "0", 10),
            alerts: parseInt(row.alerts || "0", 10),
            profileViews: parseInt(row.profile_views || "0", 10),
          };
        }
      } catch (e: any) {
        counts = { error: e.message } as any;
      }
    }

    return {
      connected: health.status === "connected",
      engine: "PostgreSQL 16",
      database: health.database || "mindaura",
      user: health.user || "mindaura",
      latencyMs: health.latencyMs,
      pool: health.pool,
      counts,
      migrations: {
        applied: migrationStatus.applied.length,
        isUpToDate: migrationStatus.isUpToDate,
      },
    };
  }

  async getPostgresStatus() {
    return await this.getStatus();
  }

  async getTableRows(table: string, limit = 50) {
    const tableName = (table || "").toLowerCase();
    if (!ALLOWED_ADMIN_TABLES.includes(tableName)) {
      throw new Error(`Invalid table name. Allowed: ${ALLOWED_ADMIN_TABLES.join(", ")}`);
    }

    const safeLimit = Math.min(100, Math.max(1, limit));

    // Never expose password or token columns even in admin database inspection
    let sql = `SELECT * FROM ${tableName} LIMIT ${safeLimit}`;
    if (tableName === "users") {
      sql = `SELECT id, username, name, email, phone, role, company_name, company_email, industry, company_size, contact_person, company_website, avatar_url, location, quote, about_me, skills, experience_level, education, created_at, updated_at FROM users LIMIT ${safeLimit}`;
    } else if (tableName === "sessions") {
      sql = `SELECT id, user_id, expires_at, created_at, last_active_at FROM sessions LIMIT ${safeLimit}`;
    }

    const result = await query(sql);
    return {
      table: tableName,
      count: result.rows.length,
      rows: result.rows,
    };
  }

  async seedData(force = true) {
    return await runSeeds(force);
  }
}

export const databaseAdminService = new DatabaseAdminService();
