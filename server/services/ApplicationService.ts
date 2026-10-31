import { applicationRepository } from "../repositories/ApplicationRepository.js";
import { ApplicationRecord } from "../models/types.js";
import { auditLogger } from "../utils/auditLogger.js";

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  Applied: ["Under Review", "Shortlisted", "Interview", "Interview Scheduled", "Rejected"],
  "Under Review": ["Shortlisted", "Interview", "Interview Scheduled", "Rejected"],
  Shortlisted: ["Interview", "Interview Scheduled", "Offered", "Rejected"],
  "Interview Scheduled": ["Interview", "Offered", "Rejected"],
  Interview: ["Offered", "Rejected"],
  Offered: ["Hired", "Rejected"],
  Hired: [],
  Rejected: ["Applied", "Under Review"], // Allow re-consideration
};

export class ApplicationService {
  async getApplications(
    caller: { userId: string; role: string },
    filterCandidateId?: string,
    filterJobId?: string,
    filterStatus?: string,
    search?: string
  ): Promise<ApplicationRecord[]> {
    const role = (caller.role || "").toLowerCase();

    if (role === "candidate" || role === "jobseeker") {
      // Candidates may only view their own personal applications
      return await applicationRepository.getAll(caller.userId);
    }

    if (role === "employer") {
      // Employers may only view applicants for their verified company's jobs
      return await applicationRepository.getForEmployer(caller.userId, filterJobId, filterStatus, search);
    }

    if (role === "admin") {
      // Admins can view all applications or filter by candidate
      return await applicationRepository.getAll(filterCandidateId);
    }

    return [];
  }

  async getApplicationById(
    id: string,
    caller: { userId: string; role: string }
  ): Promise<ApplicationRecord | null> {
    const app = await applicationRepository.getById(id);
    if (!app) return null;

    const role = (caller.role || "").toLowerCase();
    if (role === "admin") return app;

    if (role === "candidate" || role === "jobseeker") {
      if (app.candidateId !== caller.userId) {
        throw new Error("Forbidden: You can only view your own applications.");
      }
      return app;
    }

    if (role === "employer") {
      const isAuthorized = await applicationRepository.isApplicantForEmployer(id, caller.userId);
      if (!isAuthorized) {
        throw new Error("Forbidden: You are not authorized to view applicants for another company's jobs.");
      }
      return app;
    }

    throw new Error("Forbidden: Unauthorized access.");
  }

  async submitApplication(
    data: Partial<ApplicationRecord>,
    candidateSession: { userId: string; name: string; email: string; role?: string }
  ): Promise<ApplicationRecord> {
    const role = (candidateSession.role || "").toLowerCase();
    if (role === "employer") {
      throw new Error("Forbidden: Employers cannot submit job applications.");
    }

    if (!data.jobId) {
      throw new Error("jobId is required");
    }

    // Always enforce canonical initial status and candidate identity from server session
    const newApp: ApplicationRecord = {
      id: data.id || `app-${Date.now()}`,
      jobId: data.jobId,
      jobTitle: data.jobTitle || "Software Engineer",
      company: data.company || "Hiring Company",
      candidateId: candidateSession.userId,
      candidateName: data.candidateName || candidateSession.name || "Candidate",
      candidateEmail: data.candidateEmail || candidateSession.email || "candidate@email.com",
      appliedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      status: "Applied",
      stage: "Initial Screening",
      matchScore: data.matchScore || 90,
      resumeName: data.resumeName || "Resume.pdf",
      ...(data.notes ? { notes: data.notes } : {}),
    };

    const created = await applicationRepository.create(newApp);
    await auditLogger.log({
      actorId: candidateSession.userId,
      actorEmail: candidateSession.email,
      actorRole: candidateSession.role || "Candidate",
      action: "APPLICATION_SUBMITTED",
      resourceType: "application",
      resourceId: created.id,
      details: { jobId: created.jobId, company: created.company },
      outcome: "SUCCESS",
    });

    return created;
  }

  async updateStatus(
    id: string,
    newStatus: ApplicationRecord["status"],
    stage: string | undefined,
    caller: { userId: string; role: string; email?: string }
  ): Promise<ApplicationRecord | null> {
    const role = (caller.role || "").toLowerCase();

    if (role === "candidate" || role === "jobseeker") {
      throw new Error("Forbidden: Candidates cannot update application hiring statuses.");
    }

    const existing = await applicationRepository.getById(id);
    if (!existing) {
      return null;
    }

    if (role === "employer") {
      const isAuthorized = await applicationRepository.isApplicantForEmployer(id, caller.userId);
      if (!isAuthorized) {
        throw new Error("Forbidden: You can only update applications for your own company's jobs.");
      }

      // Validate status transition policy
      const allowedTransitions = VALID_STATUS_TRANSITIONS[existing.status] || [];
      if (!allowedTransitions.includes(newStatus) && existing.status !== newStatus) {
        throw new Error(
          `Invalid status transition: Cannot transition application from "${existing.status}" to "${newStatus}". Allowed: ${allowedTransitions.join(", ")}`
        );
      }
    }

    const updated = await applicationRepository.updateStatus(id, newStatus, stage);
    if (updated) {
      await auditLogger.log({
        actorId: caller.userId,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "APPLICATION_STATUS_UPDATED",
        resourceType: "application",
        resourceId: id,
        details: { oldStatus: existing.status, newStatus, stage },
        outcome: "SUCCESS",
      });
    }

    return updated;
  }

  async addRecruiterNotes(
    id: string,
    notes: string,
    caller: { userId: string; role: string; email?: string }
  ): Promise<ApplicationRecord | null> {
    const role = (caller.role || "").toLowerCase();
    if (role !== "employer" && role !== "admin") {
      throw new Error("Forbidden: Only recruiters or administrators can add internal recruiter notes.");
    }

    if (role === "employer") {
      const isAuthorized = await applicationRepository.isApplicantForEmployer(id, caller.userId);
      if (!isAuthorized) {
        throw new Error("Forbidden: You can only add notes to applicants for your own company's jobs.");
      }
    }

    const updated = await applicationRepository.updateRecruiterNotes(id, notes);
    if (updated) {
      await auditLogger.log({
        actorId: caller.userId,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "RECRUITER_NOTES_UPDATED",
        resourceType: "application",
        resourceId: id,
        details: { notesLength: notes.length },
        outcome: "SUCCESS",
      });
    }

    return updated;
  }

  async scheduleInterview(
    id: string,
    scheduledAt: Date,
    stage: string | undefined,
    caller: { userId: string; role: string; email?: string }
  ): Promise<ApplicationRecord | null> {
    const role = (caller.role || "").toLowerCase();
    if (role !== "employer" && role !== "admin") {
      throw new Error("Forbidden: Only recruiters or administrators can schedule interviews.");
    }

    if (role === "employer") {
      const isAuthorized = await applicationRepository.isApplicantForEmployer(id, caller.userId);
      if (!isAuthorized) {
        throw new Error("Forbidden: You can only schedule interviews for your own company's applicants.");
      }
    }

    const updated = await applicationRepository.scheduleInterview(id, scheduledAt, stage);
    if (updated) {
      await auditLogger.log({
        actorId: caller.userId,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "INTERVIEW_SCHEDULED",
        resourceType: "application",
        resourceId: id,
        details: { scheduledAt: scheduledAt.toISOString(), stage },
        outcome: "SUCCESS",
      });
    }

    return updated;
  }

  async deleteApplication(
    id: string,
    caller: { userId: string; role: string; email?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const existing = await applicationRepository.getById(id);
    if (!existing) {
      return { success: false, error: "Application not found." };
    }

    const role = (caller.role || "").toLowerCase();

    // Candidates may only withdraw their own application
    if (role === "candidate" || role === "jobseeker") {
      if (existing.candidateId !== caller.userId) {
        return {
          success: false,
          error: "Forbidden: You can only withdraw your own applications.",
        };
      }
    } else if (role !== "admin") {
      return {
        success: false,
        error: "Forbidden: Only candidates or administrators can withdraw applications.",
      };
    }

    await applicationRepository.delete(id);
    await auditLogger.log({
      actorId: caller.userId,
      actorEmail: caller.email,
      actorRole: caller.role,
      action: "APPLICATION_WITHDRAWN",
      resourceType: "application",
      resourceId: id,
      details: { jobId: existing.jobId },
      outcome: "SUCCESS",
    });

    return { success: true };
  }
}

export const applicationService = new ApplicationService();
