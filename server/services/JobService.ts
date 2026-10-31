import { jobRepository } from "../repositories/JobRepository.js";
import { companyMemberRepository } from "../repositories/CompanyMemberRepository.js";
import { JobRecord } from "../models/types.js";
import { auditLogger } from "../utils/auditLogger.js";

export class JobService {
  async getAllJobs(
    filtersOrSearch?: string | { search?: string; category?: string; department?: string; location?: string; employerId?: string; status?: string },
    dept?: string,
    loc?: string
  ): Promise<JobRecord[]> {
    if (typeof filtersOrSearch === "object" && filtersOrSearch !== null) {
      const search = filtersOrSearch.search;
      const department = filtersOrSearch.department || filtersOrSearch.category;
      const location = filtersOrSearch.location;
      const status = filtersOrSearch.status;
      let jobs = await jobRepository.getAll(search, department, location, status);
      if (filtersOrSearch.employerId) {
        jobs = jobs.filter((j) => j.employerId === filtersOrSearch.employerId);
      }
      return jobs;
    }

    return await jobRepository.getAll(filtersOrSearch as string | undefined, dept, loc);
  }

  async getJobById(id: string): Promise<JobRecord | null> {
    return await jobRepository.getById(id);
  }

  async getEmployerJobs(
    employerId: string,
    status?: string,
    search?: string
  ): Promise<JobRecord[]> {
    return await jobRepository.getByEmployer(employerId, status, search);
  }

  async createJob(data: Partial<JobRecord>): Promise<JobRecord> {
    if (!data.title || !data.company) {
      throw new Error("Title and company are required");
    }

    const newJob: JobRecord = {
      id: data.id || `job-${Date.now()}`,
      title: data.title,
      company: data.company,
      location: data.location || "Remote",
      type: data.type || "Full-time",
      experience: data.experience || "1-3 years",
      salary: data.salary || "Competitive",
      salaryText: data.salaryText || data.salary || "Competitive",
      description: data.description || "No description provided",
      requirements: data.requirements || [],
      department: data.department || "Engineering",
      tags: data.tags || [],
      isVerified: true,
      postedDate: "Just now",
      status: data.status || "open",
      workMode: data.workMode || "Hybrid",
      applicantCount: 0,
      ...(data.logoUrl ? { logoUrl: data.logoUrl } : {}),
      ...(data.logo ? { logo: data.logo } : {}),
      ...(data.employerId ? { employerId: data.employerId } : {}),
      ...(data.companyId ? { companyId: data.companyId } : {}),
    };

    return await jobRepository.save(newJob);
  }

  async updateJob(id: string, updates: Partial<JobRecord>): Promise<JobRecord | null> {
    const existing = await jobRepository.getById(id);
    if (!existing) return null;

    const merged: JobRecord = {
      ...existing,
      ...updates,
      id,
    };

    return await jobRepository.save(merged);
  }

  async updateJobStatus(
    id: string,
    status: "open" | "published" | "draft" | "closed" | "archived" | string,
    callerSession: { userId: string; role: string; email?: string }
  ): Promise<JobRecord | null> {
    const existing = await jobRepository.getById(id);
    if (!existing) return null;

    const callerRole = (callerSession.role || "").toLowerCase();
    if (callerRole !== "admin") {
      const isOwner = existing.employerId === callerSession.userId;
      const isCompanyMember = existing.companyId
        ? await companyMemberRepository.isUserInCompany(callerSession.userId, existing.companyId)
        : false;

      if (!isOwner && !isCompanyMember) {
        throw new Error("Forbidden: You are not authorized to change the status of this job.");
      }
    }

    const validStatuses = ["open", "active", "published", "draft", "closed", "archived"];
    if (!validStatuses.includes(status.toLowerCase())) {
      throw new Error(`Invalid status "${status}". Allowed: ${validStatuses.join(", ")}`);
    }

    const updated = await jobRepository.updateStatus(id, status.toLowerCase());

    await auditLogger.log({
      actorId: callerSession.userId,
      actorEmail: callerSession.email,
      actorRole: callerSession.role,
      action: "JOB_STATUS_UPDATED",
      resourceType: "job",
      resourceId: id,
      details: { oldStatus: existing.status, newStatus: status },
      outcome: "SUCCESS",
    });

    return updated;
  }

  async deleteJob(id: string): Promise<boolean> {
    return await jobRepository.delete(id);
  }
}

export const jobService = new JobService();
