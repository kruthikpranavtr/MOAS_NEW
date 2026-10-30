import { userRepository } from "../repositories/UserRepository.js";
import { UserRecord, SanitizedUser, UserRole, CandidateProfileRecord } from "../models/types.js";
import { hashPassword, sanitizeUser } from "../utils/crypto.js";
import { createSessionRecord } from "../middleware/auth.js";
import { auditLogger } from "../utils/auditLogger.js";
import {
  validateAvatarBuffer,
  saveAvatarFile,
  deleteStorageFile,
  AVATARS_STORAGE_DIR,
} from "../utils/storage.js";
import {
  profileCompletenessService,
  ProfileCompletenessResult,
} from "./ProfileCompletenessService.js";

export class UserService {
  async getAllUsers(): Promise<SanitizedUser[]> {
    const all = await userRepository.getAll();
    return all.map((u) => sanitizeUser(u)!);
  }

  async getUserById(idOrEmail: string): Promise<SanitizedUser | null> {
    const user = await userRepository.getByIdOrEmail(idOrEmail);
    return sanitizeUser(user);
  }

  async registerUser(data: Partial<UserRecord>): Promise<{ user: SanitizedUser; token: string }> {
    return await this.registerOrUpsertUser(data);
  }

  async registerOrUpsertUser(data: Partial<UserRecord>): Promise<{ user: SanitizedUser; token: string }> {
    const email = data.email?.trim();
    const id = data.id?.trim();
    const username = data.username?.trim();

    if (!email && !id && !username) {
      throw new Error("Email, username, or ID is required");
    }

    const existing = await userRepository.getByIdOrEmail(id || email || username || "");
    const permanentId = id || existing?.id || `MOAS-ID-${Math.floor(10000 + Math.random() * 90000)}`;

    const rawPass = data.password ? String(data.password).trim() : "User@2026!";
    const hashedPassword = rawPass.startsWith("scrypt:") ? rawPass : hashPassword(rawPass);

    // Prevent Admin self-registration: only Candidate or Employer allowed on public registration
    const requestedRole = (data.role || "").toLowerCase();
    const safeRole: UserRole = requestedRole === "employer" ? "Employer" : "Candidate";

    const userToSave: UserRecord = {
      id: permanentId,
      username: username || existing?.username || permanentId.toLowerCase(),
      password: hashedPassword,
      name: data.name || existing?.name || "New User",
      email: email || existing?.email || `${permanentId.toLowerCase()}@moas.internal`,
      phone: data.phone || existing?.phone || "+91 98000 00000",
      role: existing ? existing.role : safeRole, // Never allow role escalation on upsert
      companyName: data.companyName !== undefined ? data.companyName : existing?.companyName,
      companyEmail: data.companyEmail !== undefined ? data.companyEmail : existing?.companyEmail,
      industry: data.industry !== undefined ? data.industry : existing?.industry,
      companySize: data.companySize !== undefined ? data.companySize : existing?.companySize,
      contactPerson: data.contactPerson !== undefined ? data.contactPerson : existing?.contactPerson,
      companyWebsite: data.companyWebsite !== undefined ? data.companyWebsite : existing?.companyWebsite,
      avatarUrl: data.avatarUrl || existing?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces",
      location: data.location || existing?.location || "Bangalore, India",
      quote: data.quote !== undefined ? data.quote : (existing?.quote ?? "Innovate, build, excel."),
      aboutMe: data.aboutMe !== undefined ? data.aboutMe : (existing?.aboutMe ?? "Verified professional on MOAS Platform."),
      skills: data.skills || existing?.skills || ["Problem Solving", "Communication", "Software Engineering"],
      experienceLevel: data.experienceLevel || existing?.experienceLevel,
      education: data.education || existing?.education || [],
      resumes: data.resumes || existing?.resumes || [],
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await userRepository.save(userToSave);
    const token = await createSessionRecord(saved);

    return {
      user: sanitizeUser(saved)!,
      token,
    };
  }

  async updateProfile(
    id: string,
    updates: Partial<UserRecord>,
    caller?: { userId: string; role: string }
  ): Promise<SanitizedUser> {
    return await this.updateUserProfile(id, updates, caller);
  }

  async updateUserProfile(
    id: string,
    updates: Partial<UserRecord>,
    caller?: { userId: string; role: string }
  ): Promise<SanitizedUser> {
    const existing = await userRepository.getByIdOrEmail(id);
    if (!existing) {
      throw new Error(`User with ID "${id}" not found`);
    }

    const callerRole = (caller?.role || "").toLowerCase();

    // Mass-assignment & Privilege Escalation Protection:
    // Only administrators may alter a user's role. Normal users' attempts to change role are ignored.
    let resolvedRole = existing.role;
    if (updates.role && callerRole === "admin") {
      resolvedRole = updates.role;
    }

    const updatedUser: UserRecord = {
      ...existing,
      id, // Immutable
      role: resolvedRole,
      password: existing.password, // Password immutable via general profile update (must use reset)
      name: updates.name !== undefined ? updates.name : existing.name,
      email: updates.email !== undefined ? updates.email : existing.email,
      phone: updates.phone !== undefined ? updates.phone : existing.phone,
      username: updates.username !== undefined ? updates.username : existing.username,
      companyName: updates.companyName !== undefined ? updates.companyName : existing.companyName,
      companyEmail: updates.companyEmail !== undefined ? updates.companyEmail : existing.companyEmail,
      industry: updates.industry !== undefined ? updates.industry : existing.industry,
      companySize: updates.companySize !== undefined ? updates.companySize : existing.companySize,
      contactPerson: updates.contactPerson !== undefined ? updates.contactPerson : existing.contactPerson,
      companyWebsite: updates.companyWebsite !== undefined ? updates.companyWebsite : existing.companyWebsite,
      avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : existing.avatarUrl,
      location: updates.location !== undefined ? updates.location : existing.location,
      quote: updates.quote !== undefined ? updates.quote : existing.quote,
      aboutMe: updates.aboutMe !== undefined ? updates.aboutMe : existing.aboutMe,
      skills: updates.skills || existing.skills,
      experienceLevel: updates.experienceLevel !== undefined ? updates.experienceLevel : existing.experienceLevel,
      education: updates.education || existing.education,
      workExperience: updates.workExperience || existing.workExperience,
      projects: updates.projects || existing.projects,
      certifications: updates.certifications || existing.certifications,
      preferredCategories: updates.preferredCategories || existing.preferredCategories,
      preferredLocation: updates.preferredLocation !== undefined ? updates.preferredLocation : existing.preferredLocation,
      resumes: updates.resumes || existing.resumes,
      updatedAt: new Date().toISOString(),
    };

    const saved = await userRepository.save(updatedUser);

    // Sync candidate profile if this is a candidate
    if (saved.role.toLowerCase() === "candidate" || saved.role.toLowerCase() === "jobseeker") {
      await userRepository.saveCandidateProfile({
        userId: saved.id,
        headline: saved.quote || saved.role,
        bio: saved.aboutMe,
        skills: saved.skills || [],
        education: saved.education || [],
        workExperience: saved.workExperience || [],
        projects: saved.projects || [],
        certifications: saved.certifications || [],
        preferredLocation: saved.location,
      });
    }

    return sanitizeUser(saved)!;
  }

  async updateUserRole(
    targetUserId: string,
    newRole: UserRole,
    adminCaller: { userId: string; email?: string; role: string }
  ): Promise<SanitizedUser> {
    const validRoles: UserRole[] = ["Candidate", "Employer", "Admin"];
    if (!validRoles.includes(newRole)) {
      throw new Error(`Invalid role. Allowed roles: ${validRoles.join(", ")}`);
    }

    const existing = await userRepository.getByIdOrEmail(targetUserId);
    if (!existing) {
      throw new Error(`User with ID "${targetUserId}" not found`);
    }

    const oldRole = existing.role;
    existing.role = newRole;
    existing.updatedAt = new Date().toISOString();

    const saved = await userRepository.save(existing);

    await auditLogger.log({
      actorId: adminCaller.userId,
      actorEmail: adminCaller.email,
      actorRole: adminCaller.role,
      action: "ADMIN_USER_ROLE_UPDATED",
      resourceType: "user",
      resourceId: targetUserId,
      details: { oldRole, newRole },
      outcome: "SUCCESS",
    });

    return sanitizeUser(saved)!;
  }

  /**
   * Uploads and validates an avatar photo, saving it to private storage and updating user record.
   */
  async uploadPhoto(
    userId: string,
    buffer: Buffer
  ): Promise<{ avatarUrl: string; user: SanitizedUser; completeness: ProfileCompletenessResult }> {
    const user = await userRepository.getByIdOrEmail(userId);
    if (!user) {
      throw new Error(`User with ID "${userId}" not found.`);
    }

    // 1. Validate image format and magic bytes (JPEG/PNG/WEBP <= 2MB)
    const validation = validateAvatarBuffer(buffer);
    if (!validation.valid || !validation.detectedType) {
      throw new Error(validation.error || "Invalid avatar image file.");
    }

    // 2. Remove old custom avatar from disk if one was previously uploaded
    if (user.avatarStorageKey) {
      await deleteStorageFile(AVATARS_STORAGE_DIR, user.avatarStorageKey);
    }

    // 3. Save new file to storage
    const { storageKey } = await saveAvatarFile(buffer, userId, validation.detectedType as any);
    const avatarUrl = `/api/v1/users/${userId}/photo?t=${Date.now()}`;

    // 4. Update in PostgreSQL
    const updated = await userRepository.updatePhoto(userId, avatarUrl, storageKey);
    if (!updated) {
      throw new Error("Failed to update profile photo.");
    }

    // 5. Recalculate profile completeness
    const completeness = await this.getProfileCompleteness(userId);

    return {
      avatarUrl,
      user: sanitizeUser(updated)!,
      completeness,
    };
  }

  /**
   * Removes custom profile photo, reverting to initials or default avatar.
   */
  async removePhoto(userId: string): Promise<{ user: SanitizedUser; completeness: ProfileCompletenessResult }> {
    const user = await userRepository.getByIdOrEmail(userId);
    if (!user) {
      throw new Error(`User with ID "${userId}" not found.`);
    }

    if (user.avatarStorageKey) {
      await deleteStorageFile(AVATARS_STORAGE_DIR, user.avatarStorageKey);
    }

    const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D9488&color=ffffff&bold=true`;
    const updated = await userRepository.updatePhoto(userId, defaultAvatarUrl, "");
    if (!updated) {
      throw new Error("Failed to remove profile photo.");
    }

    const completeness = await this.getProfileCompleteness(userId);

    return {
      user: sanitizeUser(updated)!,
      completeness,
    };
  }

  /**
   * Simple photo URL update for presets or backward compatibility.
   */
  async updatePhoto(id: string, avatarUrl: string): Promise<SanitizedUser | null> {
    const user = await userRepository.getByIdOrEmail(id);
    if (!user) return null;
    user.avatarUrl = avatarUrl;
    user.updatedAt = new Date().toISOString();
    const saved = await userRepository.save(user);
    return sanitizeUser(saved);
  }

  /**
   * Retrieves candidate profile record with structured sections.
   */
  async getCandidateProfile(userId: string): Promise<CandidateProfileRecord | null> {
    return await userRepository.getCandidateProfile(userId);
  }

  /**
   * Saves candidate profile and updates completeness.
   */
  async updateCandidateProfile(
    userId: string,
    updates: Partial<CandidateProfileRecord>,
    caller: { userId: string; role: string }
  ): Promise<{ profile: CandidateProfileRecord; user: SanitizedUser; completeness: ProfileCompletenessResult }> {
    const callerRole = (caller.role || "").toLowerCase();
    const callerId = caller.userId.toLowerCase();

    if (callerRole !== "admin" && callerId !== userId.toLowerCase()) {
      throw new Error("Forbidden: You can only edit your own candidate profile.");
    }

    const user = await userRepository.getByIdOrEmail(userId);
    if (!user) {
      throw new Error(`User with ID "${userId}" not found.`);
    }

    const existingProfile = await userRepository.getCandidateProfile(userId);
    const resumes = await userRepository.getResumes(userId);

    // Merge updates
    const mergedProfile: Partial<CandidateProfileRecord> & { userId: string } = {
      ...existingProfile,
      ...updates,
      userId,
    };

    // Calculate real completeness
    const completeness = profileCompletenessService.calculate(
      {
        ...user,
        location: updates.preferredLocation || user.location,
        aboutMe: updates.bio || user.aboutMe,
        skills: updates.skills || user.skills,
        education: updates.education || user.education,
        workExperience: updates.workExperience || user.workExperience,
      },
      mergedProfile,
      resumes
    );

    mergedProfile.completenessScore = completeness.score;
    mergedProfile.missingSections = completeness.missingSections;

    // Update core user record if user fields are present in updates
    const updatedUser: UserRecord = {
      ...user,
      name: (updates as any).name !== undefined ? (updates as any).name : user.name,
      headline: updates.headline !== undefined ? updates.headline : user.headline,
      aboutMe: updates.bio !== undefined ? updates.bio : (updates as any).aboutMe !== undefined ? (updates as any).aboutMe : user.aboutMe,
      phone: (updates as any).phone !== undefined ? (updates as any).phone : user.phone,
      location: (updates as any).location !== undefined ? (updates as any).location : updates.preferredLocation || user.location,
      skills: (updates as any).skills !== undefined ? (updates as any).skills : user.skills,
      education: (updates as any).education !== undefined ? (updates as any).education : user.education,
      workExperience: updates.workExperience !== undefined ? updates.workExperience : user.workExperience,
    };
    await userRepository.save(updatedUser);

    const saved = await userRepository.saveCandidateProfile(mergedProfile);

    return {
      profile: saved,
      user: sanitizeUser(updatedUser)!,
      completeness,
    };
  }

  /**
   * Calculates profile completeness for a user.
   */
  async getProfileCompleteness(userId: string): Promise<ProfileCompletenessResult> {
    const user = await userRepository.getByIdOrEmail(userId);
    if (!user) {
      throw new Error(`User with ID "${userId}" not found.`);
    }

    const candidateProfile = await userRepository.getCandidateProfile(userId);
    const resumes = await userRepository.getResumes(userId);

    return profileCompletenessService.calculate(user, candidateProfile, resumes);
  }
}

export const userService = new UserService();
