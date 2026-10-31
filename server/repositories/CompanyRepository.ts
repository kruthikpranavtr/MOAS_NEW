import { ICompanyRepository } from "./IRepositories.js";
import { CompanyRecord, CompanyRatingRecord } from "../models/types.js";
import { query, withTransaction } from "../db/postgresClient.js";

function parseJsonField<T>(val: any, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") return val as T;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

export function mapRowToCompany(row: any): CompanyRecord {
  const isVerifiedBool = row.verified ?? (row.verification_status === "verified");
  return {
    id: row.id,
    name: row.name,
    industry: row.industry || "Technology",
    location: row.location || "",
    size: row.size || row.company_size || undefined,
    rating: parseFloat(row.rating || "4.5"),
    reviewsCount: parseInt(row.reviews_count || "0", 10),
    description: row.description || undefined,
    logo: row.logo_url || undefined,
    logoUrl: row.logo_url || undefined,
    logoStorageKey: row.logo_storage_key || undefined,
    website: row.website || undefined,
    openRolesCount: parseInt(row.open_jobs_count || "0", 10),
    openJobsCount: parseInt(row.open_jobs_count || "0", 10),
    verified: isVerifiedBool,
    verificationStatus: row.verification_status || (isVerifiedBool ? "verified" : "pending"),
    verificationNotes: row.verification_notes || undefined,
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : undefined,
    verifiedBy: row.verified_by || undefined,
    ownerUserId: row.owner_user_id || undefined,
    headquarters: row.headquarters || undefined,
    locations: parseJsonField<string[]>(row.locations, []),
    benefits: parseJsonField<string[]>(row.benefits, []),
    culture: row.culture || undefined,
    socialLinks: parseJsonField<Record<string, string>>(row.social_links, {}),
    contactEmail: row.contact_email || undefined,
    contactPhone: row.contact_phone || undefined,
    isArchived: row.is_archived ?? false,
    cultureRating: row.culture_rating ? parseFloat(row.culture_rating) : undefined,
    workLifeRating: row.work_life_rating ? parseFloat(row.work_life_rating) : undefined,
    growthRating: row.growth_rating ? parseFloat(row.growth_rating) : undefined,
    compensationRating: row.compensation_rating ? parseFloat(row.compensation_rating) : undefined,
    featuredReview: row.featured_review || undefined,
    tagline: row.tagline || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export function mapRowToRating(row: any): CompanyRatingRecord {
  return {
    id: row.id,
    companyId: row.company_id || undefined,
    companyName: row.company_name,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role || undefined,
    userAvatar: row.user_avatar || undefined,
    rating: row.rating,
    reviewTitle: row.review_title || undefined,
    reviewText: row.review_text || undefined,
    cultureRating: row.culture_rating || undefined,
    workLifeRating: row.work_life_rating || undefined,
    growthRating: row.growth_rating || undefined,
    compensationRating: row.compensation_rating || undefined,
    pros: row.pros || undefined,
    cons: row.cons || undefined,
    recommendToFriend: row.recommend_to_friend ?? true,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export interface CompanyFilterOptions {
  search?: string;
  industry?: string;
  location?: string;
  size?: string;
  verifiedOnly?: boolean;
  verificationStatus?: string;
  minRating?: number;
  includeArchived?: boolean;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export class CompanyRepository implements ICompanyRepository {
  async getAll(): Promise<CompanyRecord[]> {
    const res = await query(
      "SELECT * FROM moas.companies WHERE is_archived = false ORDER BY rating DESC, name ASC;"
    );
    return res.rows.map(mapRowToCompany);
  }

  async getTopCompanies(minRating = 0, limit = 50): Promise<CompanyRecord[]> {
    const res = await query(
      "SELECT * FROM moas.companies WHERE rating >= $1 AND is_archived = false ORDER BY rating DESC LIMIT $2;",
      [minRating, limit]
    );
    return res.rows.map(mapRowToCompany);
  }

  async search(
    filters: CompanyFilterOptions = {},
    pagination: PaginationOptions = {}
  ): Promise<{ companies: CompanyRecord[]; total: number }> {
    const limit = Math.min(Math.max(pagination.limit || 20, 1), 100);
    const offset = Math.max(pagination.offset || 0, 0);

    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (!filters.includeArchived) {
      whereClause += " AND is_archived = false";
    }

    if (filters.search && filters.search.trim()) {
      params.push(`%${filters.search.trim().toLowerCase()}%`);
      whereClause += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(COALESCE(description, '')) LIKE $${params.length} OR LOWER(COALESCE(location, '')) LIKE $${params.length})`;
    }

    if (filters.industry && filters.industry !== "All") {
      params.push(`%${filters.industry.toLowerCase()}%`);
      whereClause += ` AND LOWER(industry) LIKE $${params.length}`;
    }

    if (filters.location && filters.location !== "All") {
      params.push(`%${filters.location.toLowerCase()}%`);
      whereClause += ` AND LOWER(location) LIKE $${params.length}`;
    }

    if (filters.size && filters.size !== "All") {
      params.push(`%${filters.size.toLowerCase()}%`);
      whereClause += ` AND (LOWER(COALESCE(size, '')) LIKE $${params.length} OR LOWER(COALESCE(company_size, '')) LIKE $${params.length})`;
    }

    if (filters.verifiedOnly) {
      whereClause += " AND (verified = true OR verification_status = 'verified')";
    }

    if (filters.verificationStatus && filters.verificationStatus !== "All") {
      params.push(filters.verificationStatus.toLowerCase());
      whereClause += ` AND LOWER(verification_status) = $${params.length}`;
    }

    if (filters.minRating !== undefined && filters.minRating > 0) {
      params.push(filters.minRating);
      whereClause += ` AND rating >= $${params.length}`;
    }

    // Count query
    const countRes = await query(`SELECT COUNT(*) as total FROM moas.companies ${whereClause};`, params);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    // Data query
    params.push(limit);
    params.push(offset);
    const dataSql = `
      SELECT * FROM moas.companies 
      ${whereClause} 
      ORDER BY 
        CASE WHEN verification_status = 'verified' THEN 0 ELSE 1 END,
        rating DESC, 
        name ASC 
      LIMIT $${params.length - 1} OFFSET $${params.length};
    `;
    const res = await query(dataSql, params);

    return {
      companies: res.rows.map(mapRowToCompany),
      total,
    };
  }

  async getRatings(companyNameOrId?: string): Promise<CompanyRatingRecord[]> {
    let sql = "SELECT * FROM moas.company_ratings";
    const params: any[] = [];

    if (companyNameOrId) {
      params.push(companyNameOrId);
      sql += " WHERE LOWER(company_name) = LOWER($1) OR company_id = $1";
    }

    sql += " ORDER BY created_at DESC;";
    const res = await query(sql, params);
    return res.rows.map(mapRowToRating);
  }

  async hasUserReviewed(companyIdOrName: string, userId: string): Promise<boolean> {
    const res = await query(
      `SELECT 1 FROM moas.company_ratings 
       WHERE (company_id = $1 OR LOWER(company_name) = LOWER($1)) AND user_id = $2 
       LIMIT 1;`,
      [companyIdOrName, userId]
    );
    return res.rows.length > 0;
  }

  async saveRating(
    rating: CompanyRatingRecord
  ): Promise<{ rating: CompanyRatingRecord; company?: CompanyRecord }> {
    return await withTransaction(async (client) => {
      // 1. Ensure user exists
      const userId = rating.userId || "usr-anon";
      const userExists = await client.query(
        "SELECT id FROM moas.users WHERE id = $1 LIMIT 1;",
        [userId]
      );
      if (userExists.rows.length === 0) {
        await client.query(
          `INSERT INTO moas.users (id, email, password_hash, role, name, email_verified)
          VALUES ($1, $2, 'scrypt:autogen', 'Candidate', $3, true)
          ON CONFLICT (email) DO NOTHING;`,
          [userId, `${userId}@moas.ai`, rating.userName || "Reviewer"]
        );
      }

      // 2. Resolve company ID if missing
      let companyId = rating.companyId;
      if (!companyId) {
        const compRes = await client.query(
          "SELECT id FROM moas.companies WHERE LOWER(name) = LOWER($1) LIMIT 1;",
          [rating.companyName]
        );
        if (compRes.rows.length > 0) {
          companyId = compRes.rows[0].id;
        }
      }

      // Check duplicate review if companyId exists
      if (companyId) {
        const existingReview = await client.query(
          "SELECT id FROM moas.company_ratings WHERE company_id = $1 AND user_id = $2 LIMIT 1;",
          [companyId, userId]
        );
        if (existingReview.rows.length > 0 && existingReview.rows[0].id !== rating.id) {
          throw new Error("Duplicate review: You have already reviewed this company.");
        }
      }

      // 3. Insert or Update Rating
      const res = await client.query(
        `INSERT INTO moas.company_ratings (
          id, company_id, company_name, user_id, user_name, user_role, user_avatar, rating,
          culture_rating, work_life_rating, growth_rating, compensation_rating,
          review_title, review_text, pros, cons, recommend_to_friend, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        ON CONFLICT (id) DO UPDATE SET
          rating = EXCLUDED.rating,
          culture_rating = EXCLUDED.culture_rating,
          work_life_rating = EXCLUDED.work_life_rating,
          growth_rating = EXCLUDED.growth_rating,
          compensation_rating = EXCLUDED.compensation_rating,
          review_title = EXCLUDED.review_title,
          review_text = EXCLUDED.review_text,
          pros = EXCLUDED.pros,
          cons = EXCLUDED.cons,
          recommend_to_friend = EXCLUDED.recommend_to_friend,
          updated_at = NOW()
        RETURNING *;`,
        [
          rating.id,
          companyId || null,
          rating.companyName,
          userId,
          rating.userName,
          rating.userRole || null,
          rating.userAvatar || null,
          rating.rating,
          rating.cultureRating || null,
          rating.workLifeRating || null,
          rating.growthRating || null,
          rating.compensationRating || null,
          rating.reviewTitle || null,
          rating.reviewText || null,
          rating.pros || null,
          rating.cons || null,
          rating.recommendToFriend ?? true,
        ]
      );

      const savedRating = mapRowToRating(res.rows[0]);

      // 4. Recalculate average rating for company
      let updatedCompany: CompanyRecord | undefined;
      const targetIdentifier = companyId ? "company_id = $1" : "LOWER(company_name) = LOWER($1)";
      const targetParam = companyId || rating.companyName;

      const avgRes = await client.query(
        `SELECT AVG(rating) as avg_rating,
                AVG(culture_rating) as avg_culture,
                AVG(work_life_rating) as avg_work_life,
                AVG(growth_rating) as avg_growth,
                AVG(compensation_rating) as avg_comp,
                COUNT(*) as count 
         FROM moas.company_ratings 
         WHERE ${targetIdentifier};`,
        [targetParam]
      );

      if (avgRes.rows.length > 0 && avgRes.rows[0].count > 0) {
        const newRating = parseFloat(avgRes.rows[0].avg_rating || "4.5").toFixed(2);
        const newCount = parseInt(avgRes.rows[0].count || "1", 10);
        const avgCulture = avgRes.rows[0].avg_culture ? parseFloat(avgRes.rows[0].avg_culture).toFixed(2) : null;
        const avgWorkLife = avgRes.rows[0].avg_work_life ? parseFloat(avgRes.rows[0].avg_work_life).toFixed(2) : null;
        const avgGrowth = avgRes.rows[0].avg_growth ? parseFloat(avgRes.rows[0].avg_growth).toFixed(2) : null;
        const avgComp = avgRes.rows[0].avg_comp ? parseFloat(avgRes.rows[0].avg_comp).toFixed(2) : null;

        const updateCompSql = companyId
          ? `UPDATE moas.companies
             SET rating = $2, reviews_count = $3, culture_rating = $4, work_life_rating = $5,
                 growth_rating = $6, compensation_rating = $7, updated_at = NOW()
             WHERE id = $1
             RETURNING *;`
          : `UPDATE moas.companies
             SET rating = $2, reviews_count = $3, culture_rating = $4, work_life_rating = $5,
                 growth_rating = $6, compensation_rating = $7, updated_at = NOW()
             WHERE LOWER(name) = LOWER($1)
             RETURNING *;`;

        const compRes = await client.query(updateCompSql, [
          targetParam,
          newRating,
          newCount,
          avgCulture,
          avgWorkLife,
          avgGrowth,
          avgComp,
        ]);

        if (compRes.rows.length > 0) {
          updatedCompany = mapRowToCompany(compRes.rows[0]);
        }
      }

      return { rating: savedRating, company: updatedCompany };
    });
  }

  async deleteRating(ratingId: string): Promise<boolean> {
    const res = await query("DELETE FROM moas.company_ratings WHERE id = $1;", [ratingId]);
    return (res.rowCount || 0) > 0;
  }

  async getById(id: string): Promise<CompanyRecord | null> {
    const res = await query("SELECT * FROM moas.companies WHERE id = $1 LIMIT 1;", [id]);
    if (res.rows.length === 0) return null;
    return mapRowToCompany(res.rows[0]);
  }

  async getByName(name: string): Promise<CompanyRecord | null> {
    const res = await query(
      "SELECT * FROM moas.companies WHERE LOWER(name) = LOWER($1) LIMIT 1;",
      [name]
    );
    if (res.rows.length === 0) return null;
    return mapRowToCompany(res.rows[0]);
  }

  async create(
    company: Partial<CompanyRecord> & { ownerUserId?: string }
  ): Promise<CompanyRecord> {
    const id = company.id || `comp-${Date.now()}`;
    const initialVerificationStatus = company.verificationStatus || (company.verified ? "verified" : "pending");
    const isVerifiedBool = initialVerificationStatus === "verified";

    const res = await query(
      `INSERT INTO moas.companies (
        id, name, industry, location, size, description, website, headquarters,
        locations, benefits, culture, social_links, contact_email, contact_phone,
        rating, verified, verification_status, owner_user_id, logo_url, logo_storage_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (name) DO UPDATE SET
        industry = COALESCE(EXCLUDED.industry, companies.industry),
        location = COALESCE(EXCLUDED.location, companies.location),
        size = COALESCE(EXCLUDED.size, companies.size),
        description = COALESCE(EXCLUDED.description, companies.description),
        website = COALESCE(EXCLUDED.website, companies.website),
        headquarters = COALESCE(EXCLUDED.headquarters, companies.headquarters),
        contact_email = COALESCE(EXCLUDED.contact_email, companies.contact_email),
        contact_phone = COALESCE(EXCLUDED.contact_phone, companies.contact_phone),
        updated_at = NOW()
      RETURNING *;`,
      [
        id,
        company.name,
        company.industry || "Technology",
        company.location || "Remote",
        company.size || null,
        company.description || null,
        company.website || null,
        company.headquarters || null,
        JSON.stringify(company.locations || []),
        JSON.stringify(company.benefits || []),
        company.culture || null,
        JSON.stringify(company.socialLinks || {}),
        company.contactEmail || null,
        company.contactPhone || null,
        company.rating || 4.5,
        isVerifiedBool,
        initialVerificationStatus,
        company.ownerUserId || null,
        company.logoUrl || company.logo || null,
        company.logoStorageKey || null,
      ]
    );

    return mapRowToCompany(res.rows[0]);
  }

  async update(id: string, updates: Partial<CompanyRecord>): Promise<CompanyRecord | null> {
    const fields: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      name: "name",
      industry: "industry",
      location: "location",
      size: "size",
      description: "description",
      website: "website",
      headquarters: "headquarters",
      culture: "culture",
      contactEmail: "contact_email",
      contactPhone: "contact_phone",
      logoUrl: "logo_url",
      logoStorageKey: "logo_storage_key",
      tagline: "tagline",
      featuredReview: "featured_review",
      isArchived: "is_archived",
      ownerUserId: "owner_user_id",
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if ((updates as any)[key] !== undefined) {
        values.push((updates as any)[key]);
        fields.push(`${col} = $${values.length}`);
      }
    }

    if (updates.locations !== undefined) {
      values.push(JSON.stringify(updates.locations));
      fields.push(`locations = $${values.length}`);
    }

    if (updates.benefits !== undefined) {
      values.push(JSON.stringify(updates.benefits));
      fields.push(`benefits = $${values.length}`);
    }

    if (updates.socialLinks !== undefined) {
      values.push(JSON.stringify(updates.socialLinks));
      fields.push(`social_links = $${values.length}`);
    }

    if (fields.length === 0) {
      return await this.getById(id);
    }

    fields.push("updated_at = NOW()");
    values.push(id);
    const sql = `UPDATE moas.companies SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *;`;

    const res = await query(sql, values);
    if (res.rows.length === 0) return null;
    return mapRowToCompany(res.rows[0]);
  }

  async verifyCompany(id: string, verified = true): Promise<CompanyRecord | null> {
    const status = verified ? "verified" : "rejected";
    return await this.updateVerificationStatus(id, status);
  }

  async updateVerificationStatus(
    id: string,
    status: string,
    notes?: string,
    adminUserId?: string
  ): Promise<CompanyRecord | null> {
    const isVerified = status.toLowerCase() === "verified";
    const res = await query(
      `UPDATE moas.companies
       SET verification_status = $2,
           verified = $3,
           verification_notes = COALESCE($4, verification_notes),
           verified_at = CASE WHEN $3 = true THEN NOW() ELSE verified_at END,
           verified_by = COALESCE($5, verified_by),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [id, status.toLowerCase(), isVerified, notes || null, adminUserId || null]
    );

    if (res.rows.length === 0) return null;
    return mapRowToCompany(res.rows[0]);
  }

  async updateLogo(id: string, logoUrl: string, storageKey?: string): Promise<CompanyRecord | null> {
    const res = await query(
      `UPDATE moas.companies
       SET logo_url = $2,
           logo_storage_key = COALESCE($3, logo_storage_key),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [id, logoUrl, storageKey || null]
    );

    if (res.rows.length === 0) return null;
    return mapRowToCompany(res.rows[0]);
  }

  async archive(id: string, isArchived = true): Promise<CompanyRecord | null> {
    const res = await query(
      `UPDATE moas.companies SET is_archived = $2, updated_at = NOW() WHERE id = $1 RETURNING *;`,
      [id, isArchived]
    );
    if (res.rows.length === 0) return null;
    return mapRowToCompany(res.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const res = await query("DELETE FROM moas.companies WHERE id = $1;", [id]);
    return (res.rowCount || 0) > 0;
  }
}

export const companyRepository = new CompanyRepository();
