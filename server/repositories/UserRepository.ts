import { IUserRepository } from "./IRepositories.js";
import { UserRecord, ResumeItem, CandidateProfileRecord } from "../models/types.js";
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
    avatarStorageKey: row.avatar_storage_key || undefined,
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
    storageKey: row.storage_key || undefined,
    originalFilename: row.original_filename || row.name,
    mimeType: row.mime_type || undefined,
    fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : undefined,
    parsedText: row.parsed_text || undefined,
  };
}

function mapRowToCandidateProfile(row: any): CandidateProfileRecord {
  return {
    id: row.id,
    userId: row.user_id,
    headline: row.headline || "",
    bio: row.bio || "",
    experienceYears: row.experience_years ?? 0,
    skills: Array.isArray(row.skills)
      ? row.skills
      : typeof row.skills === "string"
      ? JSON.parse(row.skills || "[]")
      : [],
    education: Array.isArray(row.education)
      ? row.education
      : typeof row.education === "string"
      ? JSON.parse(row.education || "[]")
      : [],
    workExperience: Array.isArray(row.work_experience)
      ? row.work_experience
      : typeof row.work_experience === "string"
      ? JSON.parse(row.work_experience || "[]")
      : [],
    projects: Array.isArray(row.projects)
      ? row.projects
      : typeof row.projects === "string"
      ? JSON.parse(row.projects || "[]")
      : [],
    certifications: Array.isArray(row.certifications)
      ? row.certifications
      : typeof row.certifications === "string"
      ? JSON.parse(row.certifications || "[]")
      : [],
    preferredCategories: Array.isArray(row.preferred_categories)
      ? row.preferred_categories
      : typeof row.preferred_categories === "string"
      ? JSON.parse(row.preferred_categories || "[]")
      : [],
    preferredLocation: row.preferred_location || "",
    desiredSalary: row.desired_salary || "",
    portfolioUrl: row.portfolio_url || "",
    githubUrl: row.github_url || "",
    linkedinUrl: row.linkedin_url || "",
    completenessScore: row.completeness_score ?? 0,
    missingSections: Array.isArray(row.missing_sections)
      ? row.missing_sections
      : typeof row.missing_sections === "string"
      ? JSON.parse(row.missing_sections || "[]")
      : [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
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

  async updatePhoto(userId: string, avatarUrl: string, storageKey?: string): Promise<UserRecord | null> {
    const res = await query(
      "UPDATE users SET avatar_url = $2, avatar_storage_key = COALESCE($3, avatar_storage_key), updated_at = NOW() WHERE id = $1 RETURNING *;",
      [userId, avatarUrl, storageKey || null]
    );

    if (res.rows.length === 0) return null;
    const resumes = await this.getResumes(userId);
    return mapRowToUser(res.rows[0], resumes);
  }

  async getResumes(userId: string): Promise<ResumeItem[]> {
    const res = await query(
      "SELECT * FROM resumes WHERE user_id = $1 ORDER BY is_primary DESC, created_at DESC;",
      [userId]
    );
    return res.rows.map(mapRowToResume);
  }

  async getResumeById(id: string): Promise<ResumeItem | null> {
    const res = await query(
      "SELECT * FROM resumes WHERE id = $1 OR user_id = $1 ORDER BY is_primary DESC, created_at DESC LIMIT 1;",
      [id]
    );
    if (res.rows.length === 0) return null;
    return mapRowToResume(res.rows[0]);
  }

  async getResumeByStorageKey(storageKey: string): Promise<ResumeItem | null> {
    const res = await query(
      "SELECT * FROM resumes WHERE storage_key = $1 LIMIT 1;",
      [storageKey]
    );
    if (res.rows.length === 0) return null;
    return mapRowToResume(res.rows[0]);
  }

  async saveResume(resume: ResumeItem): Promise<ResumeItem> {
    const userId = resume.userId || "anonymous";

    return await withTransaction(async (client) => {
      // If this resume is set as primary, unmark other resumes for this user first
      if (resume.isPrimary) {
        await client.query("UPDATE resumes SET is_primary = false WHERE user_id = $1;", [userId]);
      } else {
        // If candidate has no other resumes at all, this first resume becomes primary
        const countRes = await client.query(
          "SELECT COUNT(*) as count FROM resumes WHERE user_id = $1 AND id != $2;",
          [userId, resume.id]
        );
        if (parseInt(countRes.rows[0].count, 10) === 0) {
          resume.isPrimary = true;
        }
      }

      const res = await client.query(
        `INSERT INTO resumes (
          id, user_id, name, file_url, size, type, is_primary, storage_key,
          original_filename, mime_type, file_size_bytes, parsed_text, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          file_url = COALESCE(EXCLUDED.file_url, resumes.file_url),
          size = EXCLUDED.size,
          type = EXCLUDED.type,
          is_primary = EXCLUDED.is_primary,
          storage_key = COALESCE(EXCLUDED.storage_key, resumes.storage_key),
          original_filename = COALESCE(EXCLUDED.original_filename, resumes.original_filename),
          mime_type = COALESCE(EXCLUDED.mime_type, resumes.mime_type),
          file_size_bytes = COALESCE(EXCLUDED.file_size_bytes, resumes.file_size_bytes),
          parsed_text = COALESCE(EXCLUDED.parsed_text, resumes.parsed_text),
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
          resume.storageKey || null,
          resume.originalFilename || resume.name,
          resume.mimeType || "application/pdf",
          resume.fileSizeBytes || 0,
          resume.parsedText || null,
        ]
      );

      return mapRowToResume(res.rows[0]);
    });
  }

  async setPrimaryResume(userId: string, resumeId: string): Promise<ResumeItem | null> {
    return await withTransaction(async (client) => {
      const check = await client.query(
        "SELECT id FROM resumes WHERE id = $1 AND user_id = $2 LIMIT 1;",
        [resumeId, userId]
      );
      if (check.rows.length === 0) return null;

      await client.query("UPDATE resumes SET is_primary = false WHERE user_id = $1;", [userId]);
      const res = await client.query(
        "UPDATE resumes SET is_primary = true, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *;",
        [resumeId, userId]
      );

      return mapRowToResume(res.rows[0]);
    });
  }

  async deleteResume(
    userId: string,
    resumeId: string
  ): Promise<{ deleted: boolean; storageKey?: string; newPrimaryId?: string }> {
    return await withTransaction(async (client) => {
      const target = await client.query(
        "SELECT id, is_primary, storage_key FROM resumes WHERE id = $1 AND user_id = $2 LIMIT 1;",
        [resumeId, userId]
      );
      if (target.rows.length === 0) {
        return { deleted: false };
      }

      const wasPrimary = target.rows[0].is_primary;
      const storageKey = target.rows[0].storage_key;

      await client.query("DELETE FROM resumes WHERE id = $1 AND user_id = $2;", [resumeId, userId]);

      let newPrimaryId: string | undefined;
      if (wasPrimary) {
        const next = await client.query(
          "SELECT id FROM resumes WHERE user_id = $1 ORDER BY updated_at DESC, created_at DESC LIMIT 1;",
          [userId]
        );
        if (next.rows.length > 0) {
          newPrimaryId = next.rows[0].id;
          await client.query("UPDATE resumes SET is_primary = true, updated_at = NOW() WHERE id = $1;", [
            newPrimaryId,
          ]);
        }
      }

      return { deleted: true, storageKey, newPrimaryId };
    });
  }

  async getCandidateProfile(userId: string): Promise<CandidateProfileRecord | null> {
    const res = await query(
      "SELECT * FROM candidate_profiles WHERE user_id = $1 LIMIT 1;",
      [userId]
    );
    if (res.rows.length === 0) return null;
    return mapRowToCandidateProfile(res.rows[0]);
  }

  async saveCandidateProfile(
    profile: Partial<CandidateProfileRecord> & { userId: string }
  ): Promise<CandidateProfileRecord> {
    const profileId = profile.id || `cp-${profile.userId}`;
    const existing = await this.getCandidateProfile(profile.userId);
    const existingUser = await this.getByIdOrEmail(profile.userId);

    const mergedSkills = profile.skills !== undefined ? profile.skills : existing?.skills || existingUser?.skills || [];
    const mergedEducation = profile.education !== undefined ? profile.education : existing?.education || existingUser?.education || [];
    const mergedWorkExp = profile.workExperience !== undefined ? profile.workExperience : existing?.workExperience || [];
    const mergedProjects = profile.projects !== undefined ? profile.projects : existing?.projects || [];
    const mergedCerts = profile.certifications !== undefined ? profile.certifications : existing?.certifications || [];
    const mergedCats = profile.preferredCategories !== undefined ? profile.preferredCategories : existing?.preferredCategories || [];
    const mergedMissing = profile.missingSections !== undefined ? profile.missingSections : existing?.missingSections || [];
    const mergedScore = profile.completenessScore !== undefined ? profile.completenessScore : existing?.completenessScore ?? 0;

    const skillsJson = JSON.stringify(mergedSkills);
    const educationJson = JSON.stringify(mergedEducation);
    const workExpJson = JSON.stringify(mergedWorkExp);
    const projectsJson = JSON.stringify(mergedProjects);
    const certsJson = JSON.stringify(mergedCerts);
    const preferredCatsJson = JSON.stringify(mergedCats);
    const missingSectionsJson = JSON.stringify(mergedMissing);

    return await withTransaction(async (client) => {
      const res = await client.query(
        `INSERT INTO candidate_profiles (
          id, user_id, headline, bio, experience_years, skills, education, work_experience,
          projects, certifications, preferred_categories, preferred_location, desired_salary,
          portfolio_url, github_url, linkedin_url, completeness_score, missing_sections, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          headline = COALESCE(EXCLUDED.headline, candidate_profiles.headline),
          bio = COALESCE(EXCLUDED.bio, candidate_profiles.bio),
          experience_years = COALESCE(EXCLUDED.experience_years, candidate_profiles.experience_years),
          skills = EXCLUDED.skills,
          education = EXCLUDED.education,
          work_experience = EXCLUDED.work_experience,
          projects = EXCLUDED.projects,
          certifications = EXCLUDED.certifications,
          preferred_categories = EXCLUDED.preferred_categories,
          preferred_location = COALESCE(EXCLUDED.preferred_location, candidate_profiles.preferred_location),
          desired_salary = COALESCE(EXCLUDED.desired_salary, candidate_profiles.desired_salary),
          portfolio_url = COALESCE(EXCLUDED.portfolio_url, candidate_profiles.portfolio_url),
          github_url = COALESCE(EXCLUDED.github_url, candidate_profiles.github_url),
          linkedin_url = COALESCE(EXCLUDED.linkedin_url, candidate_profiles.linkedin_url),
          completeness_score = COALESCE(EXCLUDED.completeness_score, candidate_profiles.completeness_score),
          missing_sections = EXCLUDED.missing_sections,
          updated_at = NOW()
        RETURNING *;`,
        [
          profileId,
          profile.userId,
          profile.headline || existing?.headline || null,
          profile.bio || existing?.bio || null,
          profile.experienceYears ?? existing?.experienceYears ?? 0,
          skillsJson,
          educationJson,
          workExpJson,
          projectsJson,
          certsJson,
          preferredCatsJson,
          profile.preferredLocation || existing?.preferredLocation || null,
          profile.desiredSalary || existing?.desiredSalary || null,
          profile.portfolioUrl || existing?.portfolioUrl || null,
          profile.githubUrl || existing?.githubUrl || null,
          profile.linkedinUrl || existing?.linkedinUrl || null,
          mergedScore,
          missingSectionsJson,
        ]
      );

      // Keep user table synchronized for skills, education, location, bio
      await client.query(
        `UPDATE users SET
          skills = $2,
          education = $3,
          location = COALESCE($4, location),
          about_me = COALESCE($5, about_me),
          quote = COALESCE($6, quote),
          updated_at = NOW()
        WHERE id = $1;`,
        [
          profile.userId,
          skillsJson,
          educationJson,
          profile.preferredLocation || null,
          profile.bio || null,
          profile.headline || null,
        ]
      );

      return mapRowToCandidateProfile(res.rows[0]);
    });
  }
}

export const userRepository = new UserRepository();
