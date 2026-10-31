import { employerProfileRepository } from "../repositories/EmployerProfileRepository.js";
import { companyRepository } from "../repositories/CompanyRepository.js";
import { companyMemberRepository } from "../repositories/CompanyMemberRepository.js";
import { jobRepository } from "../repositories/JobRepository.js";
import { applicationRepository } from "../repositories/ApplicationRepository.js";
import { userRepository } from "../repositories/UserRepository.js";
import { auditLogRepository } from "../repositories/AuditLogRepository.js";
import { EmployerProfileRecord, EmployerDashboardStats, CompanyRecord } from "../models/types.js";
import { auditLogger } from "../utils/auditLogger.js";

export class EmployerService {
  async getProfile(userId: string): Promise<EmployerProfileRecord | null> {
    let profile = await employerProfileRepository.getByUserId(userId);
    if (!profile) {
      // Lazy initialize from users table
      const user = await userRepository.getByIdOrEmail(userId);
      if (user && (user.role.toLowerCase() === "employer" || user.role.toLowerCase() === "admin")) {
        profile = await employerProfileRepository.upsert(userId, {
          companyName: user.companyName,
          businessEmail: user.companyEmail || user.email,
          phone: user.phone,
          designation: user.quote || "Lead Recruiter",
          jobTitle: user.quote || "Hiring Manager",
          location: user.location,
          verified: user.emailVerified ?? false,
        });
      }
    }
    return profile;
  }

  async updateProfile(
    userId: string,
    updates: Partial<EmployerProfileRecord>,
    callerSession: { userId: string; role: string; email?: string }
  ): Promise<EmployerProfileRecord> {
    const callerRole = (callerSession.role || "").toLowerCase();
    if (callerSession.userId !== userId && callerRole !== "admin") {
      throw new Error("Forbidden: You are not authorized to update another employer's profile.");
    }

    // Server-side validation
    if (updates.businessEmail && !updates.businessEmail.includes("@")) {
      throw new Error("Invalid business email format.");
    }

    if (updates.phone && updates.phone.length < 5) {
      throw new Error("Invalid phone number format.");
    }

    // If company name was updated, link or update company
    let targetCompanyId = updates.companyId;
    if (updates.companyName && !targetCompanyId) {
      const comp = await companyRepository.getByName(updates.companyName);
      if (comp) {
        targetCompanyId = comp.id;
      }
    }

    const saved = await employerProfileRepository.upsert(userId, {
      ...updates,
      companyId: targetCompanyId,
    });

    // Synchronize basic fields back to user record for consistency across navbar and profile
    const existingUser = await userRepository.getByIdOrEmail(userId);
    if (existingUser) {
      await userRepository.save({
        ...existingUser,
        name: updates.jobTitle ? existingUser.name : existingUser.name,
        phone: updates.phone || existingUser.phone,
        location: updates.location || existingUser.location,
        companyName: updates.companyName || existingUser.companyName,
        companyEmail: updates.businessEmail || existingUser.companyEmail,
        companyWebsite: updates.preferences?.website || existingUser.companyWebsite,
      });
    }

    await auditLogger.log({
      actorId: callerSession.userId,
      actorEmail: callerSession.email,
      actorRole: callerSession.role,
      action: "EMPLOYER_PROFILE_UPDATED",
      resourceType: "employer_profile",
      resourceId: saved.id,
      details: {
        companyName: saved.companyName,
        designation: saved.designation,
        businessEmail: saved.businessEmail,
      },
      outcome: "SUCCESS",
    });

    return saved;
  }

  async getDashboardStats(employerUserId: string): Promise<EmployerDashboardStats> {
    // 1. Fetch real PostgreSQL stats for jobs and applications
    const stats = await applicationRepository.getEmployerStats(employerUserId);

    // 2. Fetch recent applications
    const recentApplications = await applicationRepository.getForEmployer(employerUserId);
    const topRecentApps = recentApplications.slice(0, 10);

    // 3. Fetch primary company for this employer
    let companyProfile: CompanyRecord | null = null;
    const memberships = await companyMemberRepository.getUserCompanies(employerUserId);
    if (memberships.length > 0) {
      companyProfile = await companyRepository.getById(memberships[0].companyId);
    } else {
      const empProfile = await this.getProfile(employerUserId);
      if (empProfile?.companyId) {
        companyProfile = await companyRepository.getById(empProfile.companyId);
      } else if (empProfile?.companyName) {
        companyProfile = await companyRepository.getByName(empProfile.companyName);
      }
    }

    const verificationStatus = companyProfile?.verificationStatus || "pending";

    // 4. Fetch recent hiring activity from audit logs
    let recentActivity: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
      metadata?: Record<string, any>;
    }> = [];

    try {
      const auditLogs = await auditLogRepository.getRecent(20);
      const employerActivities = auditLogs
        .filter(
          (log) =>
            log.actorId === employerUserId ||
            (log.resourceType === "application" && recentApplications.some((a) => a.id === log.resourceId)) ||
            (companyProfile && log.resourceId === companyProfile.id)
        )
        .slice(0, 10);

      recentActivity = employerActivities.map((log) => ({
        id: log.id,
        type: log.action,
        title: formatActivityTitle(log.action),
        description: formatActivityDescription(log),
        timestamp: log.createdAt || new Date().toISOString(),
        metadata: log.details,
      }));
    } catch {
      // Fallback to recent applications transitions if audit log query fails
      recentActivity = topRecentApps.slice(0, 5).map((app) => ({
        id: `act-${app.id}`,
        type: "APPLICATION_RECEIVED",
        title: `New Application for ${app.jobTitle}`,
        description: `${app.candidateName} applied on ${app.appliedDate}`,
        timestamp: new Date().toISOString(),
      }));
    }

    return {
      totalJobsPosted: stats.totalJobsPosted,
      activeJobOpenings: stats.activeJobOpenings,
      closedJobOpenings: stats.closedJobOpenings,
      totalApplications: stats.totalApplications,
      newApplications: stats.newApplications,
      underReviewApplications: stats.underReviewApplications,
      shortlistedCandidates: stats.shortlistedCandidates,
      interviewStageCandidates: stats.interviewStageCandidates,
      offeredCandidates: stats.offeredCandidates,
      hiredCandidates: stats.hiredCandidates,
      stats: {
        totalJobs: stats.totalJobsPosted,
        activeJobs: stats.activeJobOpenings,
        closedJobs: stats.closedJobOpenings,
        totalApplications: stats.totalApplications,
        newApplications: stats.newApplications,
        underReviewApplications: stats.underReviewApplications,
        shortlistedCandidates: stats.shortlistedCandidates,
        interviewStageCandidates: stats.interviewStageCandidates,
        offeredCandidates: stats.offeredCandidates,
        hiredCandidates: stats.hiredCandidates,
      },
      recentApplications: topRecentApps,
      recentActivity,
      companyProfile,
      verificationStatus,
    };
  }
}

function formatActivityTitle(action: string): string {
  switch (action) {
    case "JOB_POSTED":
      return "Job Posting Published";
    case "JOB_UPDATED":
      return "Job Listing Updated";
    case "APPLICATION_SUBMITTED":
      return "Candidate Applied";
    case "APPLICATION_STATUS_UPDATED":
      return "Candidate Stage Updated";
    case "RECRUITER_INVITATION_SENT":
      return "Recruiter Invited";
    case "COMPANY_PROFILE_UPDATED":
      return "Company Details Updated";
    case "ADMIN_COMPANY_VERIFIED":
      return "Verification Status Modified";
    default:
      return action.replace(/_/g, " ");
  }
}

function formatActivityDescription(log: any): string {
  if (log.details?.title) {
    return `Role: ${log.details.title}`;
  }
  if (log.details?.newStatus) {
    return `Status changed to ${log.details.newStatus}`;
  }
  if (log.details?.companyName) {
    return `Company: ${log.details.companyName}`;
  }
  return `Action performed on ${log.resourceType}`;
}

export const employerService = new EmployerService();
