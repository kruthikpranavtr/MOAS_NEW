import { getDatabaseStatus, seedInitialData } from "../db.js";
import { getPostgresStatus, queryPostgres } from "../postgres.js";

const ALLOWED_ADMIN_TABLES = [
  "jobs",
  "applications",
  "users",
  "companies",
  "profile_views",
  "company_ratings",
  "saved_jobs",
  "job_alerts",
];

export class DatabaseAdminService {
  async getStatus() {
    return await getDatabaseStatus();
  }

  async getPostgresStatus() {
    return await getPostgresStatus();
  }

  async getTableRows(table: string, limit = 50) {
    const tableName = (table || "").toLowerCase();
    if (!ALLOWED_ADMIN_TABLES.includes(tableName)) {
      throw new Error(`Invalid table name. Allowed: ${ALLOWED_ADMIN_TABLES.join(", ")}`);
    }

    // Never expose password or token columns even in admin database inspection
    let sql = `SELECT * FROM ${tableName} LIMIT ${Math.min(100, Math.max(1, limit))}`;
    if (tableName === "users") {
      sql = `SELECT id, username, name, email, phone, role, company_name, company_email, industry, company_size, contact_person, company_website, avatar_url, location, quote, about_me, skills, experience_level, education, resumes, created_at, updated_at FROM users LIMIT ${Math.min(100, Math.max(1, limit))}`;
    }

    const result = await queryPostgres(sql);
    return {
      table: tableName,
      count: result.rows.length,
      rows: result.rows,
    };
  }

  async seedData(force = true) {
    return await seedInitialData(force);
  }
}

export const databaseAdminService = new DatabaseAdminService();
