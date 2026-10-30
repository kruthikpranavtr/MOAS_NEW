import { IUserRepository } from "./IRepositories.js";
import { UserRecord, ResumeItem } from "../models/types.js";
import { query, withTransaction } from "../db/postgresClient.js";
import { hashPassword } from "../utils/crypto.js";

function mapRowToUser(row: any, resumes: ResumeItem[] = []): UserRecord {
  return {
    id: row.id,
    username: row.username || undefined,
    password: row.password_hash,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    role: row.role || "Candidate",
    companyName: row.company_name || undefined,
    companyEmail: row.company_email || undefined,
    industry: row.industry || undefined,
    companySize: row.company_size || undefined,
    contactPerson: row.contact_person || undefined,
    companyWebsite: row.company_website || undefined,
    avatarUrl: row.avatar_url || "",
    location: row.location || "",
    quote: row.quote || undefined,
    aboutMe: row.about_me || undefined,
    skills: Array.isArray(row.skills)
      ? row.skills
      : typeof row.skills === "string"
      ? JSON.parse(row.skills || "[]")
      : [],
    experienceLevel: row.experience_level || undefined,
    education: Array.isArray(row.education)
      ? row.education
      : typeof row.education === "string"
      ? JSON.parse(row.education || "[]")
      : [],
    resumes,
    emailVerified: row.email_verified ?? false,
    phoneVerified: row.phone_verified ?? false,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

function mapRowToResume(row: any): ResumeItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    size: row.size || "Unknown",
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    type: (row.type as "DOCX" | "PDF") || "PDF",
    isPrimary: row.is_primary ?? false,
    dataUrl: row.file_url || undefined,
  };
}

export class UserRepository implements IUserRepository {
  async getAll(): Promise<UserRecord[]> {
    const usersRes = await query("SELECT * FROM users ORDER BY created_at DESC;");
    const resumesRes = await query("SELECT * FROM resumes ORDER BY created_at DESC;");

    const resumesByUser = new Map<string, ResumeItem[]>();
    for (const r of resumesRes.rows) {
      const item = mapRowToResume(r);
      const list = resumesByUser.get(r.user_id) || [];
      list.push(item);
      resumesByUser.set(r.user_id, list);
    }

    return usersRes.rows.map((row) => mapRowToUser(row, resumesByUser.get(row.id) || []));
  }

  async getByIdOrEmail(idOrEmail: string): Promise<UserRecord | null> {
    const trimmed = (idOrEmail || "").trim();
    const res = await query(
      "SELECT * FROM users WHERE id = $1 OR LOWER(email) = LOWER($1) OR username = $1 LIMIT 1;",
      [trimmed]
    );

    if (res.rows.length === 0) return null;
    const userRow = res.rows[0];

    const resumes = await this.getResumes(userRow.id);
    return mapRowToUser(userRow, resumes);
  }

  async save(user: UserRecord): Promise<UserRecord> {
    let passwordHash = user.password;
    if (passwordHash && !passwordHash.startsWith("scrypt:")) {
      passwordHash = hashPassword(passwordHash);
    }

    // If password is not provided on update, preserve existing hash
    if (!passwordHash) {
      const existing = await query("SELECT password_hash FROM users WHERE id = $1 LIMIT 1;", [user.id]);
      if (existing.rows.length > 0) {
        passwordHash = existing.rows[0].password_hash;
      } else {
        passwordHash = hashPassword("Default@Secure2026");
      }
    }

    const skillsJson = JSON.stringify(user.skills || []);
    const educationJson = JSON.stringify(user.education || []);

    const res = await query(
      `INSERT INTO users (
        id, email, password_hash, role, name, username, phone, avatar_url, location,
        quote, about_me, skills, experience_level, education, company_name, company_email,
        industry, company_size, contact_person, company_website, email_verified, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW())
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        username = EXCLUDED.username,
        phone = EXCLUDED.phone,
        avatar_url = EXCLUDED.avatar_url,
        location = EXCLUDED.location,
        quote = EXCLUDED.quote,
        about_me = EXCLUDED.about_me,
        skills = EXCLUDED.skills,
        experience_level = EXCLUDED.experience_level,
        education = EXCLUDED.education,
        company_name = EXCLUDED.company_name,
        company_email = EXCLUDED.company_email,
        industry = EXCLUDED.industry,
        company_size = EXCLUDED.company_size,
        contact_person = EXCLUDED.contact_person,
        company_website = EXCLUDED.company_website,
        updated_at = NOW()
      RETURNING *;`,
      [
        user.id,
        user.email,
        passwordHash,
        user.role || "Candidate",
        user.name,
        user.username || null,
        user.phone || null,
        user.avatarUrl || null,
        user.location || null,
        user.quote || null,
        user.aboutMe || null,
        skillsJson,
        user.experienceLevel || null,
        educationJson,
        user.companyName || null,
        user.companyEmail || null,
        user.industry || null,
        user.companySize || null,
        user.contactPerson || null,
        user.companyWebsite || null,
        true,
      ]
    );

    const userRow = res.rows[0];
    const resumes = await this.getResumes(userRow.id);
    return mapRowToUser(userRow, resumes);
  }

  async updatePhoto(userId: string, avatarUrl: string): Promise<UserRecord | null> {
    const res = await query(
      "UPDATE users SET avatar_url = $2, updated_at = NOW() WHERE id = $1 RETURNING *;",
      [userId, avatarUrl]
    );

    if (res.rows.length === 0) return null;
    const resumes = await this.getResumes(userId);
    return mapRowToUser(res.rows[0], resumes);
  }

  async getResumes(userId: string): Promise<ResumeItem[]> {
    const res = await query(
      "SELECT * FROM resumes WHERE user_id = $1 ORDER BY created_at DESC;",
      [userId]
    );
    return res.rows.map(mapRowToResume);
  }

  async getResumeById(id: string): Promise<ResumeItem | null> {
    const res = await query(
      "SELECT * FROM resumes WHERE id = $1 OR user_id = $1 ORDER BY created_at DESC LIMIT 1;",
      [id]
    );
    if (res.rows.length === 0) return null;
    return mapRowToResume(res.rows[0]);
  }

  async saveResume(resume: ResumeItem): Promise<ResumeItem> {
    const userId = resume.userId || "anonymous";
    const res = await query(
      `INSERT INTO resumes (
        id, user_id, name, file_url, size, type, is_primary, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        file_url = EXCLUDED.file_url,
        size = EXCLUDED.size,
        type = EXCLUDED.type,
        is_primary = EXCLUDED.is_primary,
        updated_at = NOW()
      RETURNING *;`,
      [
        resume.id,
        userId,
        resume.name,
        resume.dataUrl || null,
        resume.size || "Unknown",
        resume.type || "PDF",
        resume.isPrimary ?? false,
      ]
    );

    return mapRowToResume(res.rows[0]);
  }
}

export const userRepository = new UserRepository();
