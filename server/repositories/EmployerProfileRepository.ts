import { query } from "../db/postgresClient.js";
import { EmployerProfileRecord } from "../models/types.js";

function mapRowToEmployerProfile(row: any): EmployerProfileRecord {
  return {
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id || undefined,
    companyName: row.company_name || undefined,
    jobTitle: row.job_title || undefined,
    department: row.department || undefined,
    businessEmail: row.business_email || undefined,
    phone: row.phone || undefined,
    designation: row.designation || undefined,
    location: row.location || undefined,
    preferences: row.preferences && typeof row.preferences === "object" ? row.preferences : {},
    verified: row.verified ?? false,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export class EmployerProfileRepository {
  async getByUserId(userId: string): Promise<EmployerProfileRecord | null> {
    const res = await query(
      `SELECT * FROM moas.employer_profiles WHERE user_id = $1 LIMIT 1;`,
      [userId]
    );
    if (res.rows.length === 0) return null;
    return mapRowToEmployerProfile(res.rows[0]);
  }

  async upsert(
    userId: string,
    data: Partial<EmployerProfileRecord>
  ): Promise<EmployerProfileRecord> {
    const id = data.id || `emp-prof-${userId}`;
    const preferencesJson = JSON.stringify(data.preferences || {});

    const res = await query(
      `INSERT INTO moas.employer_profiles (
        id, user_id, company_id, company_name, job_title, department,
        business_email, phone, designation, location, preferences, verified, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        company_id = COALESCE(EXCLUDED.company_id, employer_profiles.company_id),
        company_name = COALESCE(EXCLUDED.company_name, employer_profiles.company_name),
        job_title = COALESCE(EXCLUDED.job_title, employer_profiles.job_title),
        department = COALESCE(EXCLUDED.department, employer_profiles.department),
        business_email = COALESCE(EXCLUDED.business_email, employer_profiles.business_email),
        phone = COALESCE(EXCLUDED.phone, employer_profiles.phone),
        designation = COALESCE(EXCLUDED.designation, employer_profiles.designation),
        location = COALESCE(EXCLUDED.location, employer_profiles.location),
        preferences = COALESCE(EXCLUDED.preferences, employer_profiles.preferences),
        updated_at = NOW()
      RETURNING *;`,
      [
        id,
        userId,
        data.companyId || null,
        data.companyName || null,
        data.jobTitle || null,
        data.department || null,
        data.businessEmail || null,
        data.phone || null,
        data.designation || null,
        data.location || null,
        preferencesJson,
        data.verified ?? false,
      ]
    );

    return mapRowToEmployerProfile(res.rows[0]);
  }
}

export const employerProfileRepository = new EmployerProfileRepository();
