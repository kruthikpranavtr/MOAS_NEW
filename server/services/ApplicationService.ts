import { applicationRepository } from "../repositories/ApplicationRepository.js";
import { ApplicationRecord } from "../models/types.js";

export class ApplicationService {
  async getApplications(candidateId?: string): Promise<ApplicationRecord[]> {
    return await applicationRepository.getAll(candidateId);
  }

  async getApplicationById(id: string): Promise<ApplicationRecord | null> {
    return await applicationRepository.getById(id);
  }

  async submitApplication(
    data: Partial<ApplicationRecord>,
    candidateSession: { userId: string; name: string; email: string }
  ): Promise<ApplicationRecord> {
    if (!data.jobId) {
      throw new Error("jobId is required");
    }

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

    return await applicationRepository.create(newApp);
  }

  async updateStatus(
    id: string,
    status: ApplicationRecord["status"],
    stage?: string
  ): Promise<ApplicationRecord | null> {
    return await applicationRepository.updateStatus(id, status, stage);
  }

  async deleteApplication(id: string, caller: { userId: string; role: string }): Promise<{ success: boolean; error?: string }> {
    const existing = await applicationRepository.getById(id);
    if (existing) {
      const userRole = (caller.role || "").toLowerCase();
      if (existing.candidateId !== caller.userId && !["employer", "admin"].includes(userRole)) {
        return {
          success: false,
          error: "Access denied. You can only manage your own applications.",
        };
      }
    }

    await applicationRepository.delete(id);
    return { success: true };
  }
}

export const applicationService = new ApplicationService();
