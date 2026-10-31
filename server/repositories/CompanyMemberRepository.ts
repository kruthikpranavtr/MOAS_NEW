import { query, withTransaction } from "../db/postgresClient.js";
import { CompanyMemberRecord } from "../models/types.js";

function mapRowToMember(row: any): CompanyMemberRecord {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    userId: row.user_id || row.userId,
    role: row.role,
    isVerified: row.is_verified ?? row.isVerified ?? false,
    invitationEmail: row.invitation_email || undefined,
    invitationToken: row.invitation_token || undefined,
    status: row.status || "accepted",
    invitedBy: row.invited_by || undefined,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
    userName: row.user_name || undefined,
    userEmail: row.user_email || undefined,
    userAvatar: row.avatar_url || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export class CompanyMemberRepository {
  async getMembership(companyId: string, userId: string): Promise<CompanyMemberRecord | null> {
    const res = await query(
      `SELECT cm.*, u.name as user_name, u.email as user_email, u.avatar_url
       FROM moas.company_members cm
       LEFT JOIN moas.users u ON cm.user_id = u.id
       WHERE cm.company_id = $1 AND cm.user_id = $2;`,
      [companyId, userId]
    );

    if (res.rows.length === 0) return null;
    return mapRowToMember(res.rows[0]);
  }

  async getUserCompanies(userId: string): Promise<CompanyMemberRecord[]> {
    const res = await query(
      `SELECT cm.*, u.name as user_name, u.email as user_email, u.avatar_url, c.name as company_name
       FROM moas.company_members cm
       LEFT JOIN moas.users u ON cm.user_id = u.id
       LEFT JOIN moas.companies c ON cm.company_id = c.id
       WHERE cm.user_id = $1 AND cm.status = 'accepted';`,
      [userId]
    );

    return res.rows.map(mapRowToMember);
  }

  async getCompanyMembers(companyId: string): Promise<CompanyMemberRecord[]> {
    const res = await query(
      `SELECT cm.*, u.name as user_name, u.email as user_email, u.avatar_url
       FROM moas.company_members cm
       LEFT JOIN moas.users u ON cm.user_id = u.id
       WHERE cm.company_id = $1
       ORDER BY 
         CASE cm.role 
           WHEN 'owner' THEN 1 
           WHEN 'admin' THEN 2 
           WHEN 'recruiter' THEN 3 
           ELSE 4 
         END,
         cm.created_at ASC;`,
      [companyId]
    );

    return res.rows.map(mapRowToMember);
  }

  async addMember(record: Omit<CompanyMemberRecord, "id"> & { id?: string }): Promise<CompanyMemberRecord> {
    const id = record.id || `cm-${record.userId}-${record.companyId}`;
    const res = await query(
      `INSERT INTO moas.company_members (
        id, company_id, user_id, role, is_verified, status, invitation_email, invited_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (company_id, user_id) 
      DO UPDATE SET 
        role = EXCLUDED.role, 
        is_verified = EXCLUDED.is_verified, 
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;`,
      [
        id,
        record.companyId,
        record.userId,
        record.role || "recruiter",
        record.isVerified ?? false,
        record.status || "accepted",
        record.invitationEmail || null,
        record.invitedBy || null,
      ]
    );

    return mapRowToMember(res.rows[0]);
  }

  async updateMemberRole(
    companyId: string,
    userId: string,
    newRole: "owner" | "admin" | "recruiter" | "member"
  ): Promise<CompanyMemberRecord | null> {
    const res = await query(
      `UPDATE moas.company_members
       SET role = $3, updated_at = NOW()
       WHERE company_id = $1 AND (user_id = $2 OR id = $2)
       RETURNING *;`,
      [companyId, userId, newRole]
    );

    if (res.rows.length === 0) return null;
    return mapRowToMember(res.rows[0]);
  }

  async removeMember(companyId: string, userId: string): Promise<boolean> {
    const res = await query(
      `DELETE FROM moas.company_members WHERE company_id = $1 AND (user_id = $2 OR id = $2);`,
      [companyId, userId]
    );
    return (res.rowCount || 0) > 0;
  }

  async transferOwnership(
    companyId: string,
    currentOwnerId: string,
    newOwnerId: string
  ): Promise<boolean> {
    return await withTransaction(async (client) => {
      // 1. Demote current owner to admin in company_members
      await client.query(
        `UPDATE moas.company_members
         SET role = 'admin', updated_at = NOW()
         WHERE company_id = $1 AND user_id = $2;`,
        [companyId, currentOwnerId]
      );

      // 2. Promote new owner to owner in company_members
      await client.query(
        `UPDATE moas.company_members
         SET role = 'owner', is_verified = true, status = 'accepted', updated_at = NOW()
         WHERE company_id = $1 AND user_id = $2;`,
        [companyId, newOwnerId]
      );

      // 3. Update owner_user_id in companies table
      await client.query(
        `UPDATE moas.companies
         SET owner_user_id = $2, updated_at = NOW()
         WHERE id = $1;`,
        [companyId, newOwnerId]
      );

      return true;
    });
  }

  async createInvitation(
    companyId: string,
    email: string,
    token: string,
    invitedBy: string,
    role: "admin" | "recruiter" = "recruiter",
    expiresAt?: Date
  ): Promise<CompanyMemberRecord> {
    const id = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const expiry = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Check if user already exists
    const userRes = await query("SELECT id FROM moas.users WHERE LOWER(email) = LOWER($1) LIMIT 1;", [email]);
    const userId = userRes.rows[0]?.id || `pending-usr-${Date.now()}`;

    const res = await query(
      `INSERT INTO moas.company_members (
        id, company_id, user_id, role, is_verified, status, invitation_email, invitation_token, invited_by, expires_at
      ) VALUES ($1, $2, $3, $4, false, 'pending', $5, $6, $7, $8)
      ON CONFLICT (company_id, user_id) DO UPDATE SET
        invitation_token = EXCLUDED.invitation_token,
        status = 'pending',
        role = EXCLUDED.role,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
      RETURNING *;`,
      [id, companyId, userId, role, email.toLowerCase(), token, invitedBy, expiry]
    );

    return mapRowToMember(res.rows[0]);
  }

  async getInvitationByToken(token: string): Promise<CompanyMemberRecord | null> {
    const res = await query(
      `SELECT cm.*, c.name as company_name
       FROM moas.company_members cm
       JOIN moas.companies c ON cm.company_id = c.id
       WHERE cm.invitation_token = $1 AND cm.status = 'pending' AND (cm.expires_at IS NULL OR cm.expires_at > NOW())
       LIMIT 1;`,
      [token]
    );

    if (res.rows.length === 0) return null;
    return mapRowToMember(res.rows[0]);
  }

  async acceptInvitation(token: string, acceptingUserId: string): Promise<CompanyMemberRecord | null> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) return null;

    return await withTransaction(async (client) => {
      // If invitation was stored under a temporary userId, update or merge with acceptingUserId
      const res = await client.query(
        `UPDATE moas.company_members
         SET user_id = $2,
             status = 'accepted',
             is_verified = true,
             invitation_token = NULL,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *;`,
        [invitation.id, acceptingUserId]
      );

      return mapRowToMember(res.rows[0]);
    });
  }

  async isUserInCompany(userId: string, companyId: string): Promise<boolean> {
    const membership = await this.getMembership(companyId, userId);
    return !!membership && membership.isVerified && membership.status === "accepted";
  }

  async isOwnerOrAdmin(userId: string, companyId: string): Promise<boolean> {
    const membership = await this.getMembership(companyId, userId);
    if (!membership || !membership.isVerified || membership.status !== "accepted") {
      return false;
    }
    return membership.role === "owner" || membership.role === "admin";
  }
}

export const companyMemberRepository = new CompanyMemberRepository();
