import { query } from "../db/postgresClient.js";
import { CompanyMemberRecord } from "../models/types.js";
import { logger } from "../utils/logger.js";

export class CompanyMemberRepository {
  async getMembership(companyId: string, userId: string): Promise<CompanyMemberRecord | null> {
    const res = await query(
      `SELECT id, company_id as "companyId", user_id as "userId", role, is_verified as "isVerified",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM moas.company_members
       WHERE company_id = $1 AND user_id = $2;`,
      [companyId, userId]
    );

    return res.rows[0] || null;
  }

  async getUserCompanies(userId: string): Promise<CompanyMemberRecord[]> {
    const res = await query(
      `SELECT id, company_id as "companyId", user_id as "userId", role, is_verified as "isVerified",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM moas.company_members
       WHERE user_id = $1;`,
      [userId]
    );

    return res.rows;
  }

  async getCompanyMembers(companyId: string): Promise<CompanyMemberRecord[]> {
    const res = await query(
      `SELECT id, company_id as "companyId", user_id as "userId", role, is_verified as "isVerified",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM moas.company_members
       WHERE company_id = $1;`,
      [companyId]
    );

    return res.rows;
  }

  async addMember(record: Omit<CompanyMemberRecord, "id"> & { id?: string }): Promise<CompanyMemberRecord> {
    const id = record.id || `cm-${record.userId}-${record.companyId}`;
    const res = await query(
      `INSERT INTO moas.company_members (id, company_id, user_id, role, is_verified)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (company_id, user_id) 
       DO UPDATE SET role = EXCLUDED.role, is_verified = EXCLUDED.is_verified, updated_at = CURRENT_TIMESTAMP
       RETURNING id, company_id as "companyId", user_id as "userId", role, is_verified as "isVerified",
                 created_at as "createdAt", updated_at as "updatedAt";`,
      [id, record.companyId, record.userId, record.role || "recruiter", record.isVerified ?? true]
    );

    return res.rows[0];
  }

  async removeMember(companyId: string, userId: string): Promise<boolean> {
    const res = await query(
      `DELETE FROM moas.company_members WHERE company_id = $1 AND user_id = $2;`,
      [companyId, userId]
    );
    return (res.rowCount || 0) > 0;
  }

  async isUserInCompany(userId: string, companyId: string): Promise<boolean> {
    const membership = await this.getMembership(companyId, userId);
    return !!membership && membership.isVerified;
  }
}

export const companyMemberRepository = new CompanyMemberRepository();
