import { userRepository } from "../repositories/UserRepository.js";
import { UserRecord, SanitizedUser, UserRole } from "../models/types.js";
import { hashPassword, sanitizeUser } from "../utils/crypto.js";
import { createSessionRecord } from "../middleware/auth.js";
import { auditLogger } from "../utils/auditLogger.js";

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
      resumes: updates.resumes || existing.resumes,
      updatedAt: new Date().toISOString(),
    };

    const saved = await userRepository.save(updatedUser);
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

  async updatePhoto(id: string, avatarUrl: string): Promise<SanitizedUser | null> {
    const user = await userRepository.getByIdOrEmail(id);
    if (!user) return null;
    user.avatarUrl = avatarUrl;
    user.updatedAt = new Date().toISOString();
    const saved = await userRepository.save(user);
    return sanitizeUser(saved);
  }
}

export const userService = new UserService();
