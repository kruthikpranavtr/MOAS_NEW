import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { companyRepository, CompanyFilterOptions, PaginationOptions } from "../repositories/CompanyRepository.js";
import { companyMemberRepository } from "../repositories/CompanyMemberRepository.js";
import { CompanyRecord, CompanyRatingRecord, CompanyMemberRecord } from "../models/types.js";
import { auditLogger } from "../utils/auditLogger.js";

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const LOGO_STORAGE_DIR = path.resolve(process.cwd(), "uploads", "companies", "logos");

function validateImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // WebP: RIFF ... WEBP
  if (mimeType === "image/webp") {
    const isRiff =
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp =
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  return false;
}

export class CompanyService {
  async getAllCompanies(): Promise<CompanyRecord[]> {
    return await companyRepository.getAll();
  }

  async getTopCompanies(minRating = 0, limit = 50): Promise<CompanyRecord[]> {
    return await companyRepository.getTopCompanies(minRating, limit);
  }

  async searchCompanies(
    filters: CompanyFilterOptions,
    pagination: PaginationOptions
  ): Promise<{ companies: CompanyRecord[]; total: number; limit: number; offset: number }> {
    const limit = pagination.limit || 20;
    const offset = pagination.offset || 0;
    const result = await companyRepository.search(filters, { limit, offset });
    return {
      companies: result.companies,
      total: result.total,
      limit,
      offset,
    };
  }

  async getCompanyById(id: string): Promise<CompanyRecord | null> {
    return await companyRepository.getById(id);
  }

  async getCompanyByName(name: string): Promise<CompanyRecord | null> {
    return await companyRepository.getByName(name);
  }

  async createCompany(
    data: Partial<CompanyRecord>,
    creatorSession: { userId: string; role: string; email?: string }
  ): Promise<CompanyRecord> {
    if (!data.name || !data.name.trim()) {
      throw new Error("Company name is required.");
    }

    const callerRole = (creatorSession.role || "").toLowerCase();
    if (callerRole === "candidate" || callerRole === "jobseeker") {
      throw new Error("Forbidden: Candidates are not permitted to register companies.");
    }

    const existing = await companyRepository.getByName(data.name.trim());
    if (existing) {
      throw new Error(`A company with the name "${data.name}" already exists.`);
    }

    // Force non-admins to start with "pending" verification status (Self-approval blocked!)
    const initialStatus = callerRole === "admin" && data.verificationStatus ? data.verificationStatus : "pending";

    const companyData: Partial<CompanyRecord> & { ownerUserId: string } = {
      ...data,
      name: data.name.trim(),
      ownerUserId: creatorSession.userId,
      verificationStatus: initialStatus,
      verified: initialStatus === "verified",
    };

    const created = await companyRepository.create(companyData);

    // Add creator as company owner in company_members table
    await companyMemberRepository.addMember({
      companyId: created.id,
      userId: creatorSession.userId,
      role: "owner",
      isVerified: true,
      status: "accepted",
    });

    await auditLogger.log({
      actorId: creatorSession.userId,
      actorEmail: creatorSession.email,
      actorRole: creatorSession.role,
      action: "COMPANY_CREATED",
      resourceType: "company",
      resourceId: created.id,
      details: { companyName: created.name, verificationStatus: created.verificationStatus },
      outcome: "SUCCESS",
    });

    return created;
  }

  async updateCompany(
    id: string,
    updates: Partial<CompanyRecord>,
    callerSession: { userId: string; role: string; email?: string }
  ): Promise<CompanyRecord> {
    const company = await companyRepository.getById(id);
    if (!company) {
      throw new Error(`Company with ID "${id}" not found.`);
    }

    const callerRole = (callerSession.role || "").toLowerCase();

    // Authorization: Must be Platform Admin OR Company Owner/Admin
    if (callerRole !== "admin") {
      const isAuthorized = await companyMemberRepository.isOwnerOrAdmin(callerSession.userId, id);
      if (!isAuthorized) {
        throw new Error("Forbidden: You are not authorized to update this company's profile.");
      }
    }

    // Protect sensitive fields from non-admin updates (e.g. self-verification)
    if (callerRole !== "admin") {
      delete updates.verified;
      delete updates.verificationStatus;
      delete updates.verificationNotes;
      delete updates.verifiedAt;
      delete updates.verifiedBy;
      delete updates.rating;
      delete updates.reviewsCount;
      delete updates.ownerUserId;
    }

    const updated = await companyRepository.update(id, updates);
    if (!updated) {
      throw new Error("Failed to update company record.");
    }

    await auditLogger.log({
      actorId: callerSession.userId,
      actorEmail: callerSession.email,
      actorRole: callerSession.role,
      action: "COMPANY_PROFILE_UPDATED",
      resourceType: "company",
      resourceId: id,
      details: { companyName: updated.name, fields: Object.keys(updates) },
      outcome: "SUCCESS",
    });

    return updated;
  }

  async updateVerificationStatus(
    companyId: string,
    status: string,
    notes: string | undefined,
    adminSession: { userId: string; role: string; email?: string }
  ): Promise<CompanyRecord> {
    const callerRole = (adminSession.role || "").toLowerCase();
    if (callerRole !== "admin") {
      throw new Error("Forbidden: Only platform administrators can verify, reject or suspend companies.");
    }

    const validStatuses = ["pending", "under_review", "verified", "rejected", "suspended"];
    const normalizedStatus = status.toLowerCase();
    if (!validStatuses.includes(normalizedStatus)) {
      throw new Error(`Invalid verification status "${status}". Allowed: ${validStatuses.join(", ")}`);
    }

    const existing = await companyRepository.getById(companyId);
    if (!existing) {
      throw new Error(`Company with ID "${companyId}" not found.`);
    }

    const updated = await companyRepository.updateVerificationStatus(
      companyId,
      normalizedStatus,
      notes,
      adminSession.userId
    );

    if (!updated) {
      throw new Error("Failed to update company verification status.");
    }

    await auditLogger.log({
      actorId: adminSession.userId,
      actorEmail: adminSession.email,
      actorRole: adminSession.role,
      action: "ADMIN_COMPANY_VERIFIED",
      resourceType: "company",
      resourceId: companyId,
      details: {
        companyName: updated.name,
        oldStatus: existing.verificationStatus,
        newStatus: normalizedStatus,
        notes,
      },
      outcome: "SUCCESS",
    });

    return updated;
  }

  async getMembers(
    companyId: string,
    callerSession: { userId: string; role: string }
  ): Promise<CompanyMemberRecord[]> {
    const callerRole = (callerSession.role || "").toLowerCase();
    if (callerRole !== "admin") {
      const isMember = await companyMemberRepository.isUserInCompany(callerSession.userId, companyId);
      if (!isMember) {
        throw new Error("Forbidden: You must be a member of this company to view team members.");
      }
    }

    return await companyMemberRepository.getCompanyMembers(companyId);
  }

  async inviteRecruiter(
    companyId: string,
    email: string,
    role: "admin" | "recruiter" = "recruiter",
    callerSession: { userId: string; role: string; email?: string }
  ): Promise<{ invitation: CompanyMemberRecord; invitationToken: string }> {
    const callerRole = (callerSession.role || "").toLowerCase();
    if (callerRole !== "admin") {
      const isOwnerOrAdmin = await companyMemberRepository.isOwnerOrAdmin(callerSession.userId, companyId);
      if (!isOwnerOrAdmin) {
        throw new Error("Forbidden: Only company owners or administrators can invite recruiters.");
      }
    }

    if (!email || !email.includes("@")) {
      throw new Error("Valid email address is required.");
    }

    const token = `inv-${crypto.randomBytes(24).toString("hex")}`;
    const invitation = await companyMemberRepository.createInvitation(
      companyId,
      email.toLowerCase().trim(),
      token,
      callerSession.userId,
      role
    );

    await auditLogger.log({
      actorId: callerSession.userId,
      actorEmail: callerSession.email,
      actorRole: callerSession.role,
      action: "RECRUITER_INVITATION_SENT",
      resourceType: "company_member",
      resourceId: invitation.id,
      details: { companyId, invitedEmail: email, role },
      outcome: "SUCCESS",
    });

    return { invitation, invitationToken: token };
  }

  async acceptInvitation(
    token: string,
    userSession: { userId: string; role: string; email: string }
  ): Promise<CompanyMemberRecord> {
    const invitation = await companyMemberRepository.getInvitationByToken(token);
    if (!invitation) {
      throw new Error("Invalid or expired invitation token.");
    }

    const accepted = await companyMemberRepository.acceptInvitation(token, userSession.userId);
    if (!accepted) {
      throw new Error("Failed to accept invitation.");
    }

    await auditLogger.log({
      actorId: userSession.userId,
      actorEmail: userSession.email,
      actorRole: userSession.role,
      action: "RECRUITER_INVITATION_ACCEPTED",
      resourceType: "company_member",
      resourceId: accepted.id,
      details: { companyId: accepted.companyId, role: accepted.role },
      outcome: "SUCCESS",
    });

    return accepted;
  }

  async updateMemberRole(
    companyId: string,
    targetUserId: string,
    newRole: "owner" | "admin" | "recruiter" | "member",
    callerSession: { userId: string; role: string; email?: string }
  ): Promise<CompanyMemberRecord> {
    const callerRole = (callerSession.role || "").toLowerCase();
    if (callerRole !== "admin") {
      const isOwner = (await companyMemberRepository.getMembership(companyId, callerSession.userId))?.role === "owner";
      if (!isOwner) {
        throw new Error("Forbidden: Only company owners or administrators can change member roles.");
      }
    }

    if (newRole === "owner") {
      throw new Error("Use transfer ownership to assign a new company owner.");
    }

    const updated = await companyMemberRepository.updateMemberRole(companyId, targetUserId, newRole);
    if (!updated) {
      throw new Error("Target member not found in company.");
    }

    await auditLogger.log({
      actorId: callerSession.userId,
      actorEmail: callerSession.email,
      actorRole: callerSession.role,
      action: "COMPANY_MEMBER_ROLE_UPDATED",
      resourceType: "company_member",
      resourceId: updated.id,
      details: { companyId, targetUserId, newRole },
      outcome: "SUCCESS",
    });

    return updated;
  }

  async removeMember(
    companyId: string,
    targetUserId: string,
    callerSession: { userId: string; role: string; email?: string }
  ): Promise<{ success: boolean }> {
    const callerRole = (callerSession.role || "").toLowerCase();
    const callerMembership = await companyMemberRepository.getMembership(companyId, callerSession.userId);

    if (callerRole !== "admin") {
      if (!callerMembership || (callerMembership.role !== "owner" && callerMembership.role !== "admin")) {
        throw new Error("Forbidden: Only company owners or administrators can remove members.");
      }
      // Target member role check
      const targetMembership = await companyMemberRepository.getMembership(companyId, targetUserId);
      if (targetMembership?.role === "owner") {
        throw new Error("Forbidden: The company owner cannot be removed. Transfer ownership first.");
      }
    }

    const removed = await companyMemberRepository.removeMember(companyId, targetUserId);

    await auditLogger.log({
      actorId: callerSession.userId,
      actorEmail: callerSession.email,
      actorRole: callerSession.role,
      action: "COMPANY_MEMBER_REMOVED",
      resourceType: "company_member",
      resourceId: `cm-${targetUserId}-${companyId}`,
      details: { companyId, targetUserId },
      outcome: "SUCCESS",
    });

    return { success: removed };
  }

  async transferOwnership(
    companyId: string,
    newOwnerId: string,
    callerSession: { userId: string; role: string; email?: string }
  ): Promise<{ success: boolean }> {
    const callerRole = (callerSession.role || "").toLowerCase();
    const company = await companyRepository.getById(companyId);
    if (!company) {
      throw new Error("Company not found.");
    }

    if (callerRole !== "admin" && company.ownerUserId !== callerSession.userId) {
      throw new Error("Forbidden: Only the current company owner or platform administrator can transfer ownership.");
    }

    const newOwnerMembership = await companyMemberRepository.getMembership(companyId, newOwnerId);
    if (!newOwnerMembership) {
      throw new Error("The target new owner must already be a member of the company.");
    }

    await companyMemberRepository.transferOwnership(companyId, company.ownerUserId || callerSession.userId, newOwnerId);

    await auditLogger.log({
      actorId: callerSession.userId,
      actorEmail: callerSession.email,
      actorRole: callerSession.role,
      action: "COMPANY_OWNERSHIP_TRANSFERRED",
      resourceType: "company",
      resourceId: companyId,
      details: { previousOwner: company.ownerUserId, newOwner: newOwnerId },
      outcome: "SUCCESS",
    });

    return { success: true };
  }

  async uploadLogo(
    companyId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string,
    callerSession: { userId: string; role: string; email?: string }
  ): Promise<{ logoUrl: string; storageKey: string }> {
    const callerRole = (callerSession.role || "").toLowerCase();
    if (callerRole !== "admin") {
      const isAuthorized = await companyMemberRepository.isOwnerOrAdmin(callerSession.userId, companyId);
      if (!isAuthorized) {
        throw new Error("Forbidden: You are not authorized to upload branding for this company.");
      }
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new Error("Invalid file type: Only JPEG, PNG, and WebP images are allowed.");
    }

    if (fileBuffer.length > MAX_LOGO_SIZE_BYTES) {
      throw new Error("File too large: Maximum logo file size is 2MB.");
    }

    if (!validateImageMagicBytes(fileBuffer, mimeType.toLowerCase())) {
      throw new Error("File content validation failed: Invalid image header signature.");
    }

    // Prepare secure storage
    await fs.mkdir(LOGO_STORAGE_DIR, { recursive: true });

    const ext = path.extname(originalFilename).toLowerCase() || (mimeType === "image/png" ? ".png" : ".jpg");
    const storageKey = `logo-${companyId}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    const targetFilePath = path.join(LOGO_STORAGE_DIR, storageKey);

    await fs.writeFile(targetFilePath, fileBuffer);

    const logoUrl = `/api/v1/companies/${companyId}/logo`;
    await companyRepository.updateLogo(companyId, logoUrl, storageKey);

    await auditLogger.log({
      actorId: callerSession.userId,
      actorEmail: callerSession.email,
      actorRole: callerSession.role,
      action: "COMPANY_LOGO_UPLOADED",
      resourceType: "company",
      resourceId: companyId,
      details: { storageKey, originalFilename, size: fileBuffer.length },
      outcome: "SUCCESS",
    });

    return { logoUrl, storageKey };
  }

  async getLogoFile(companyId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const company = await companyRepository.getById(companyId);
    if (!company || !company.logoStorageKey) return null;

    const filePath = path.join(LOGO_STORAGE_DIR, company.logoStorageKey);
    try {
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(company.logoStorageKey).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      return { buffer, mimeType };
    } catch {
      return null;
    }
  }

  async deleteLogo(
    companyId: string,
    callerSession: { userId: string; role: string; email?: string }
  ): Promise<{ success: boolean }> {
    const callerRole = (callerSession.role || "").toLowerCase();
    if (callerRole !== "admin") {
      const isAuthorized = await companyMemberRepository.isOwnerOrAdmin(callerSession.userId, companyId);
      if (!isAuthorized) {
        throw new Error("Forbidden: You are not authorized to delete branding for this company.");
      }
    }

    const company = await companyRepository.getById(companyId);
    if (!company) {
      throw new Error("Company not found.");
    }

    if (company.logoStorageKey) {
      const filePath = path.join(LOGO_STORAGE_DIR, company.logoStorageKey);
      try {
        await fs.unlink(filePath);
      } catch {
        // ignore if already deleted
      }
    }

    await companyRepository.updateLogo(companyId, "", "");

    await auditLogger.log({
      actorId: callerSession.userId,
      actorEmail: callerSession.email,
      actorRole: callerSession.role,
      action: "COMPANY_LOGO_DELETED",
      resourceType: "company",
      resourceId: companyId,
      details: { previousStorageKey: company.logoStorageKey },
      outcome: "SUCCESS",
    });

    return { success: true };
  }

  async getRatings(companyNameOrId?: string): Promise<CompanyRatingRecord[]> {
    return await companyRepository.getRatings(companyNameOrId);
  }

  async addRating(data: any): Promise<CompanyRatingRecord> {
    const userSession = {
      userId: data.userId || "anon_user",
      name: data.userName || "Anonymous Reviewer",
    };
    const res = await this.submitRating(data, userSession);
    return res.rating;
  }

  async submitRating(
    data: Partial<CompanyRatingRecord> & { companyId?: string },
    userSession: { userId: string; name: string; role?: string; email?: string }
  ): Promise<{ rating: CompanyRatingRecord; company?: CompanyRecord }> {
    const compName = data.companyName || data.companyId || "Company";

    // Prevent duplicate reviews
    const hasReviewed = await companyRepository.hasUserReviewed(compName, userSession.userId);
    if (hasReviewed) {
      throw new Error("Duplicate review: You have already submitted a review for this company.");
    }

    const ratingVal = Math.min(Math.max(Number(data.rating) || 5, 1), 5);

    const newRating: CompanyRatingRecord = {
      id: data.id || `rate-${Date.now()}`,
      companyId: data.companyId,
      companyName: compName,
      userId: userSession.userId,
      userName: data.userName || userSession.name || "Verified Reviewer",
      userRole: data.userRole || userSession.role || "Team Member",
      userAvatar:
        data.userAvatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      rating: ratingVal,
      cultureRating: Number(data.cultureRating) || ratingVal,
      workLifeRating: Number(data.workLifeRating) || ratingVal,
      growthRating: Number(data.growthRating) || ratingVal,
      compensationRating: Number(data.compensationRating) || ratingVal,
      reviewTitle: data.reviewTitle || `Experience with ${compName}`,
      reviewText: data.reviewText || "Strong technical culture with high engineering standards.",
      pros: data.pros || "Great work environment and skilled peers",
      cons: data.cons || "Fast-paced deliverables",
      recommendToFriend: data.recommendToFriend !== undefined ? Boolean(data.recommendToFriend) : true,
      createdAt: new Date().toISOString(),
    };

    const result = await companyRepository.saveRating(newRating);

    await auditLogger.log({
      actorId: userSession.userId,
      actorEmail: userSession.email,
      actorRole: userSession.role,
      action: "COMPANY_REVIEW_SUBMITTED",
      resourceType: "company_rating",
      resourceId: result.rating.id,
      details: { companyName: compName, rating: ratingVal },
      outcome: "SUCCESS",
    });

    return result;
  }

  async deleteRating(
    ratingId: string,
    callerSession: { userId: string; role: string; email?: string }
  ): Promise<boolean> {
    const callerRole = (callerSession.role || "").toLowerCase();
    if (callerRole !== "admin") {
      throw new Error("Forbidden: Only platform administrators can moderate and delete reviews.");
    }

    const deleted = await companyRepository.deleteRating(ratingId);
    if (deleted) {
      await auditLogger.log({
        actorId: callerSession.userId,
        actorEmail: callerSession.email,
        actorRole: callerSession.role,
        action: "COMPANY_REVIEW_MODERATED",
        resourceType: "company_rating",
        resourceId: ratingId,
        details: { action: "DELETE" },
        outcome: "SUCCESS",
      });
    }
    return deleted;
  }

  async archiveCompany(
    companyId: string,
    callerSession: { userId: string; role: string; email?: string }
  ): Promise<CompanyRecord | null> {
    const callerRole = (callerSession.role || "").toLowerCase();
    if (callerRole !== "admin") {
      const isOwner = (await companyMemberRepository.getMembership(companyId, callerSession.userId))?.role === "owner";
      if (!isOwner) {
        throw new Error("Forbidden: Only company owners or administrators can archive companies.");
      }
    }

    const archived = await companyRepository.archive(companyId, true);

    await auditLogger.log({
      actorId: callerSession.userId,
      actorEmail: callerSession.email,
      actorRole: callerSession.role,
      action: "COMPANY_ARCHIVED",
      resourceType: "company",
      resourceId: companyId,
      details: { companyName: archived?.name },
      outcome: "SUCCESS",
    });

    return archived;
  }
}

export const companyService = new CompanyService();
