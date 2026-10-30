import { ICompanyRepository } from "./IRepositories.js";
import { CompanyRecord, CompanyRatingRecord } from "../models/types.js";
import { query, withTransaction } from "../db/postgresClient.js";

function mapRowToCompany(row: any): CompanyRecord {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry || "Technology",
    location: row.location || "",
    size: row.company_size || undefined,
    rating: parseFloat(row.rating || "4.5"),
    reviewsCount: parseInt(row.reviews_count || "0", 10),
    description: row.description || undefined,
    logo: row.logo_url || undefined,
    logoUrl: row.logo_url || undefined,
    website: row.website || undefined,
    openRolesCount: parseInt(row.open_jobs_count || "0", 10),
    openJobsCount: parseInt(row.open_jobs_count || "0", 10),
    verified: row.verified ?? true,
    cultureRating: row.culture_rating ? parseFloat(row.culture_rating) : undefined,
    workLifeRating: row.work_life_rating ? parseFloat(row.work_life_rating) : undefined,
    growthRating: row.growth_rating ? parseFloat(row.growth_rating) : undefined,
    compensationRating: row.compensation_rating ? parseFloat(row.compensation_rating) : undefined,
    featuredReview: row.featured_review || undefined,
    tagline: row.tagline || undefined,
  };
}

function mapRowToRating(row: any): CompanyRatingRecord {
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

export class CompanyRepository implements ICompanyRepository {
  async getAll(): Promise<CompanyRecord[]> {
    const res = await query("SELECT * FROM companies ORDER BY rating DESC, name ASC;");
    return res.rows.map(mapRowToCompany);
  }

  async getTopCompanies(minRating = 0, limit = 50): Promise<CompanyRecord[]> {
    const res = await query(
      "SELECT * FROM companies WHERE rating >= $1 ORDER BY rating DESC LIMIT $2;",
      [minRating, limit]
    );
    return res.rows.map(mapRowToCompany);
  }

  async getRatings(companyName?: string): Promise<CompanyRatingRecord[]> {
    let sql = "SELECT * FROM company_ratings";
    const params: any[] = [];

    if (companyName) {
      params.push(companyName);
      sql += " WHERE LOWER(company_name) = LOWER($1)";
    }

    sql += " ORDER BY created_at DESC;";
    const res = await query(sql, params);
    return res.rows.map(mapRowToRating);
  }

  async saveRating(rating: CompanyRatingRecord): Promise<{ rating: CompanyRatingRecord; company?: CompanyRecord }> {
    return await withTransaction(async (client) => {
      // 1. Ensure user exists
      const userId = rating.userId || "usr-anon";
      const userExists = await client.query("SELECT id FROM users WHERE id = $1 LIMIT 1;", [userId]);
      if (userExists.rows.length === 0) {
        await client.query(
          `INSERT INTO users (id, email, password_hash, role, name, email_verified)
          VALUES ($1, $2, 'scrypt:autogen', 'Candidate', $3, true)
          ON CONFLICT (email) DO NOTHING;`,
          [userId, `${userId}@moas.ai`, rating.userName || "Reviewer"]
        );
      }

      // 2. Insert Rating
      const res = await client.query(
        `INSERT INTO company_ratings (
          id, company_name, user_id, user_name, user_role, user_avatar, rating,
          culture_rating, work_life_rating, growth_rating, compensation_rating,
          review_title, review_text, pros, cons, recommend_to_friend
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          rating = EXCLUDED.rating,
          review_title = EXCLUDED.review_title,
          review_text = EXCLUDED.review_text
        RETURNING *;`,
        [
          rating.id,
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

      // 3. Recalculate average rating for company
      const avgRes = await client.query(
        "SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM company_ratings WHERE LOWER(company_name) = LOWER($1);",
        [rating.companyName]
      );

      let updatedCompany: CompanyRecord | undefined;
      if (avgRes.rows.length > 0) {
        const newRating = parseFloat(avgRes.rows[0].avg_rating || "4.5").toFixed(2);
        const newCount = parseInt(avgRes.rows[0].count || "1", 10);

        const compRes = await client.query(
          `UPDATE companies
          SET rating = $2, reviews_count = $3, updated_at = NOW()
          WHERE LOWER(name) = LOWER($1)
          RETURNING *;`,
          [rating.companyName, newRating, newCount]
        );

        if (compRes.rows.length > 0) {
          updatedCompany = mapRowToCompany(compRes.rows[0]);
        }
      }

      return { rating: savedRating, company: updatedCompany };
    });
  }

  async getById(id: string): Promise<CompanyRecord | null> {
    const res = await query("SELECT * FROM moas.companies WHERE id = $1 LIMIT 1;", [id]);
    if (res.rows.length === 0) return null;
    return mapRowToCompany(res.rows[0]);
  }

  async getByName(name: string): Promise<CompanyRecord | null> {
    const res = await query("SELECT * FROM moas.companies WHERE LOWER(name) = LOWER($1) LIMIT 1;", [name]);
    if (res.rows.length === 0) return null;
    return mapRowToCompany(res.rows[0]);
  }

  async create(company: Partial<CompanyRecord> & { ownerUserId?: string }): Promise<CompanyRecord> {
    const id = company.id || `comp-${Date.now()}`;
    const res = await query(
      `INSERT INTO moas.companies (
        id, name, industry, location, rating, verified, owner_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (name) DO UPDATE SET
        industry = COALESCE(EXCLUDED.industry, companies.industry),
        location = COALESCE(EXCLUDED.location, companies.location),
        updated_at = NOW()
      RETURNING *;`,
      [
        id,
        company.name,
        company.industry || "Technology",
        company.location || "Remote",
        company.rating || 4.5,
        company.verified ?? false,
        company.ownerUserId || null,
      ]
    );

    return mapRowToCompany(res.rows[0]);
  }

  async verifyCompany(id: string, verified = true): Promise<CompanyRecord | null> {
    const res = await query(
      `UPDATE moas.companies
       SET verified = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [id, verified]
    );

    if (res.rows.length === 0) return null;
    return mapRowToCompany(res.rows[0]);
  }
}

export const companyRepository = new CompanyRepository();
