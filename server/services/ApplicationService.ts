import { applicationRepository } from "../repositories/ApplicationRepository.js";
import { jobRepository } from "../repositories/JobRepository.js";
import { userRepository } from "../repositories/UserRepository.js";
import { companyMemberRepository } from "../repositories/CompanyMemberRepository.js";
import { notificationRepository } from "../repositories/NotificationRepository.js";
import { ApplicationRecord, ApplicationHistoryRecord } from "../models/types.js";
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
  Withdrawn: [],
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
      const apps = await applicationRepository.getAll(caller.userId);
      // Attach history to each candidate application
      for (const app of apps) {
        app.history = await applicationRepository.getHistory(app.id);
      }
      return apps;
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
    if (role === "admin") {
      app.history = await applicationRepository.getHistory(id);
      return app;
    }

    if (role === "candidate" || role === "jobseeker") {
      if (app.candidateId !== caller.userId) {
        throw new Error("Forbidden: You can only view your own applications.");
      }
      app.history = await applicationRepository.getHistory(id);
      return app;
    }

    if (role === "employer") {
      const isAuthorized = await applicationRepository.isApplicantForEmployer(id, caller.userId);
      if (!isAuthorized) {
        throw new Error("Forbidden: You are not authorized to view applicants for another company's jobs.");
      }
      app.history = await applicationRepository.getHistory(id);
      return app;
    }

    throw new Error("Forbidden: Unauthorized access.");
  }

  async getApplicationHistory(
    id: string,
    caller: { userId: string; role: string }
  ): Promise<ApplicationHistoryRecord[]> {
    const app = await applicationRepository.getById(id);
    if (!app) {
      throw new Error(`Application with ID "${id}" not found.`);
    }

    const role = (caller.role || "").toLowerCase();
    if (role !== "admin") {
      if (role === "candidate" || role === "jobseeker") {
        if (app.candidateId !== caller.userId) {
          throw new Error("Forbidden: You can only view history for your own applications.");
        }
      } else if (role === "employer") {
        const isAuthorized = await applicationRepository.isApplicantForEmployer(id, caller.userId);
        if (!isAuthorized) {
          throw new Error("Forbidden: You are not authorized to view history for this application.");
        }
      } else {
        throw new Error("Forbidden: Unauthorized.");
      }
    }

    return await applicationRepository.getHistory(id);
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

    // 1. Verify job exists and is open for applications
    const targetJob = await jobRepository.getById(data.jobId);
    if (!targetJob) {
      throw new Error(`Job with ID "${data.jobId}" not found.`);
    }

    const jobStatus = (targetJob.status || "open").toLowerCase();
    if (jobStatus === "closed" || jobStatus === "archived" || jobStatus === "draft" || jobStatus === "suspended") {
      throw new Error(`Cannot apply to a ${jobStatus} job.`);
    }

    if (targetJob.applicationDeadline) {
      const deadline = new Date(targetJob.applicationDeadline);
      if (!isNaN(deadline.getTime()) && deadline.getTime() < Date.now()) {
        throw new Error("Cannot apply to an expired job listing. Application deadline has passed.");
      }
    }

    // 2. Prevent duplicate active applications per candidate policy
    const existingActive = await applicationRepository.getActiveApplication(candidateSession.userId, targetJob.id);
    if (existingActive) {
      throw new Error("Conflict: You have already submitted an active application for this position.");
    }

    // 3. Resolve and validate selected resume
    let resolvedResumeId: string | undefined = undefined;
    let resolvedResumeName: string = data.resumeName || "Resume.pdf";
    let resolvedResumeUrl: string | undefined = data.resumeUrl || undefined;

    if (data.resumeId) {
      const resume = await userRepository.getResumeById(data.resumeId);
      if (!resume || resume.userId !== candidateSession.userId) {
        throw new Error("Invalid resume selected. Resume not found or does not belong to your account.");
      }
      resolvedResumeId = resume.id;
      resolvedResumeName = resume.name;
      resolvedResumeUrl = resume.fileUrl;
    } else {
      // Find candidate's primary resume
      const resumes = await userRepository.getResumes(candidateSession.userId);
      const primary = resumes.find((r) => r.isPrimary) || resumes[0];
      if (primary) {
        resolvedResumeId = primary.id;
        resolvedResumeName = primary.name;
        resolvedResumeUrl = primary.fileUrl;
      }
    }

    // 4. Construct authoritative application record
    const newApp: ApplicationRecord = {
      id: data.id || `app-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      jobId: targetJob.id,
      jobTitle: targetJob.title,
      company: targetJob.company,
      candidateId: candidateSession.userId,
      candidateName: candidateSession.name || "Candidate",
      candidateEmail: candidateSession.email || "candidate@email.com",
      appliedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      status: "Applied",
      stage: "Initial Screening",
      matchScore: data.matchScore ?? 90,
      resumeId: resolvedResumeId,
      resumeName: resolvedResumeName,
      resumeUrl: resolvedResumeUrl,
      coverLetter: data.coverLetter ? String(data.coverLetter).trim() : undefined,
      notes: data.notes || undefined,
    };

    const created = await applicationRepository.create(newApp);

    // 5. Record initial application history
    await applicationRepository.addHistory({
      applicationId: created.id,
      previousStatus: undefined,
      newStatus: "Applied",
      stage: "Initial Screening",
      actorId: candidateSession.userId,
      actorRole: candidateSession.role || "Candidate",
      reason: "Application submitted by candidate",
    });

    // 6. Notifications: Candidate confirmation
    try {
      await notificationRepository.create({
        userId: candidateSession.userId,
        type: "application",
        title: "Application Submitted",
        message: `Your application for "${targetJob.title}" at ${targetJob.company} has been received.`,
        link: "/applications",
        metadata: { applicationId: created.id, jobId: targetJob.id, company: targetJob.company },
      });

      // Notifications: Employer(s) alert
      const recipients: string[] = [];
      if (targetJob.employerId) {
        recipients.push(targetJob.employerId);
      }
      if (targetJob.companyId) {
        const members = await companyMemberRepository.getCompanyMembers(targetJob.companyId);
        for (const m of members) {
          if (!recipients.includes(m.userId)) {
            recipients.push(m.userId);
          }
        }
      }

      for (const empUserId of recipients) {
        await notificationRepository.create({
          userId: empUserId,
          type: "application",
          title: "New Application Received",
          message: `${candidateSession.name} applied for "${targetJob.title}".`,
          link: "/employer",
          metadata: { applicationId: created.id, jobId: targetJob.id, candidateId: candidateSession.userId },
        });
      }
    } catch (notifErr) {
      // Don't fail application if notification creation encounters a transient error
      console.warn("[ApplicationService] Notification trigger warning:", notifErr);
    }

    // 7. Audit log
    await auditLogger.log({
      actorId: candidateSession.userId,
      actorEmail: candidateSession.email,
      actorRole: candidateSession.role || "Candidate",
      action: "APPLICATION_SUBMITTED",
      resourceType: "application",
      resourceId: created.id,
      details: { jobId: created.jobId, company: created.company, resumeId: resolvedResumeId },
      outcome: "SUCCESS",
    });

    created.history = await applicationRepository.getHistory(created.id);
    return created;
  }

  async updateStatus(
    id: string,
    newStatus: ApplicationRecord["status"],
    stage: string | undefined,
    caller: { userId: string; role: string; email?: string },
    reason?: string
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

    const updated = await applicationRepository.updateStatus(id, newStatus, stage, reason);
    if (updated) {
      // Record status transition history
      await applicationRepository.addHistory({
        applicationId: id,
        previousStatus: existing.status,
        newStatus,
        stage: stage || updated.stage,
        actorId: caller.userId,
        actorRole: caller.role,
        reason: reason || `Status updated to ${newStatus}`,
      });

      // Notify candidate of status change
      try {
        let notifTitle = `Application Status: ${newStatus}`;
        let notifType = "application";
        let notifMsg = `Your application for "${existing.jobTitle}" at ${existing.company} is now ${newStatus}.`;

        if (newStatus === "Offered") {
          notifTitle = "Job Offer Extended!";
          notifType = "offer";
          notifMsg = `Congratulations! ${existing.company} has extended a job offer for "${existing.jobTitle}".`;
        } else if (newStatus === "Interview Scheduled" || newStatus === "Interview") {
          notifTitle = "Interview Scheduled";
          notifType = "interview";
          notifMsg = `${existing.company} has scheduled an interview for your "${existing.jobTitle}" application.`;
        } else if (newStatus === "Hired") {
          notifTitle = "Hired!";
          notifType = "offer";
          notifMsg = `Congratulations! You have been officially hired for "${existing.jobTitle}" at ${existing.company}.`;
        }

        await notificationRepository.create({
          userId: existing.candidateId,
          type: notifType,
          title: notifTitle,
          message: notifMsg,
          link: "/applications",
          metadata: { applicationId: id, newStatus, stage },
        });
      } catch (notifErr) {
        console.warn("[ApplicationService] Status notification warning:", notifErr);
      }

      await auditLogger.log({
        actorId: caller.userId,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "APPLICATION_STATUS_UPDATED",
        resourceType: "application",
        resourceId: id,
        details: { oldStatus: existing.status, newStatus, stage, reason },
        outcome: "SUCCESS",
      });

      updated.history = await applicationRepository.getHistory(id);
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

    const existing = await applicationRepository.getById(id);
    if (!existing) return null;

    if (role === "employer") {
      const isAuthorized = await applicationRepository.isApplicantForEmployer(id, caller.userId);
      if (!isAuthorized) {
        throw new Error("Forbidden: You can only schedule interviews for your own company's applicants.");
      }
    }

    const updated = await applicationRepository.scheduleInterview(id, scheduledAt, stage);
    if (updated) {
      await applicationRepository.addHistory({
        applicationId: id,
        previousStatus: existing.status,
        newStatus: "Interview Scheduled",
        stage: stage || "Interview Scheduled",
        actorId: caller.userId,
        actorRole: caller.role,
        reason: `Interview scheduled for ${scheduledAt.toISOString()}`,
      });

      // Notify candidate
      try {
        await notificationRepository.create({
          userId: existing.candidateId,
          type: "interview",
          title: "Interview Scheduled",
          message: `${existing.company} scheduled an interview for "${existing.jobTitle}" on ${scheduledAt.toLocaleString()}.`,
          link: "/applications",
          metadata: { applicationId: id, scheduledAt: scheduledAt.toISOString() },
        });
      } catch (notifErr) {
        console.warn("[ApplicationService] Interview notification warning:", notifErr);
      }

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

  async withdrawApplication(
    id: string,
    caller: { userId: string; role: string; email?: string },
    reason?: string
  ): Promise<ApplicationRecord | null> {
    const existing = await applicationRepository.getById(id);
    if (!existing) {
      throw new Error("Application not found.");
    }

    const role = (caller.role || "").toLowerCase();
    if (role === "candidate" || role === "jobseeker") {
      if (existing.candidateId !== caller.userId) {
        throw new Error("Forbidden: You can only withdraw your own applications.");
      }
    } else if (role !== "admin") {
      throw new Error("Forbidden: Only candidates or administrators can withdraw applications.");
    }

    if (existing.status === "Withdrawn") {
      return existing;
    }

    if (existing.status === "Hired") {
      throw new Error("Cannot withdraw an application that has already reached Hired status.");
    }

    const updated = await applicationRepository.withdraw(id, reason);
    if (updated) {
      await applicationRepository.addHistory({
        applicationId: id,
        previousStatus: existing.status,
        newStatus: "Withdrawn",
        stage: "Withdrawn",
        actorId: caller.userId,
        actorRole: caller.role,
        reason: reason || "Withdrawn by candidate",
      });

      // Notify employer
      try {
        const targetJob = await jobRepository.getById(existing.jobId);
        if (targetJob?.employerId) {
          await notificationRepository.create({
            userId: targetJob.employerId,
            type: "application",
            title: "Application Withdrawn",
            message: `${existing.candidateName} has withdrawn their application for "${existing.jobTitle}".`,
            link: "/employer",
            metadata: { applicationId: id, jobId: existing.jobId },
          });
        }
      } catch (notifErr) {
        console.warn("[ApplicationService] Withdraw notification warning:", notifErr);
      }

      await auditLogger.log({
        actorId: caller.userId,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "APPLICATION_WITHDRAWN",
        resourceType: "application",
        resourceId: id,
        details: { jobId: existing.jobId, reason },
        outcome: "SUCCESS",
      });
    }

    return updated;
  }

  async deleteApplication(
    id: string,
    caller: { userId: string; role: string; email?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const withdrawn = await this.withdrawApplication(id, caller, "Application deleted/withdrawn");
      return { success: Boolean(withdrawn) };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

export const applicationService = new ApplicationService();
