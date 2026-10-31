import { jobRepository } from "../repositories/JobRepository.js";
import { companyMemberRepository } from "../repositories/CompanyMemberRepository.js";
import { JobRecord, JobSearchParams, JobSearchResult } from "../models/types.js";
import { auditLogger } from "../utils/auditLogger.js";

export class JobService {
  async getAllJobs(
    filtersOrSearch?: string | JobSearchParams,
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

  async searchJobs(params: JobSearchParams): Promise<JobSearchResult> {
    return await jobRepository.searchJobs(params);
  }

  async getCategoryCounts(): Promise<Array<{ category: string; count: number }>> {
    return await jobRepository.getCategoryCounts();
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
    if (!data.title || !data.title.trim()) {
      throw new Error("Job title is required");
    }
    if (!data.company || !data.company.trim()) {
      throw new Error("Company name is required");
    }
    const description = (data.description && data.description.trim())
      ? data.description.trim()
      : `Opportunity for ${data.title.trim()} at ${data.company.trim()}.`;

    const rawStatus = (data.status || "open").toLowerCase();
    const validStatuses = ["open", "published", "draft", "closed", "archived"];
    if (!validStatuses.includes(rawStatus)) {
      throw new Error(`Invalid job status "${data.status}". Allowed: ${validStatuses.join(", ")}`);
    }

    const minSal = data.salaryMin !== undefined && data.salaryMin !== null ? Number(data.salaryMin) : undefined;
    const maxSal = data.salaryMax !== undefined && data.salaryMax !== null ? Number(data.salaryMax) : undefined;

    if (minSal !== undefined && maxSal !== undefined && minSal > maxSal) {
      throw new Error("Minimum salary cannot be greater than maximum salary.");
    }

    const newJob: JobRecord = {
      id: data.id || `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: data.title.trim(),
      company: data.company.trim(),
      companyId: data.companyId || undefined,
      employerId: data.employerId || undefined,
      location: data.location || "Remote",
      type: data.type || "Full-time",
      experience: data.experience || "1-3 years",
      salary: data.salary || (minSal && maxSal ? `${minSal} - ${maxSal} ${data.salaryCurrency || "USD"}` : "Competitive"),
      salaryText: data.salaryText || data.salary || (minSal && maxSal ? `${minSal} - ${maxSal} ${data.salaryCurrency || "USD"}` : "Competitive"),
      salaryMin: minSal,
      salaryMax: maxSal,
      salaryCurrency: data.salaryCurrency || "USD",
      salaryPeriod: data.salaryPeriod || "yearly",
      description: description,
      responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities : [],
      qualifications: Array.isArray(data.qualifications) ? data.qualifications : [],
      skills: Array.isArray(data.skills) ? data.skills : (data.tags || []),
      preferredSkills: Array.isArray(data.preferredSkills) ? data.preferredSkills : [],
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      benefits: Array.isArray(data.benefits) ? data.benefits : [],
      department: data.department || data.category || "Engineering",
      category: data.category || data.department || "Engineering",
      tags: Array.isArray(data.tags) ? data.tags : (data.skills || []),
      isVerified: data.isVerified ?? true,
      postedDate: "Just now",
      status: rawStatus,
      workMode: data.workMode || "Hybrid",
      applicantCount: 0,
      openingsCount: data.openingsCount ? Math.max(1, Number(data.openingsCount)) : 1,
      isFeatured: data.isFeatured ?? false,
      logoUrl: data.logoUrl || data.logo || undefined,
      logo: data.logoUrl || data.logo || undefined,
      applicationDeadline: data.applicationDeadline || undefined,
      publishedAt: rawStatus === "published" || rawStatus === "open" ? new Date().toISOString() : undefined,
    };

    return await jobRepository.save(newJob);
  }

  async updateJob(id: string, updates: Partial<JobRecord>): Promise<JobRecord | null> {
    const existing = await jobRepository.getById(id);
    if (!existing) return null;

    if (updates.salaryMin !== undefined && updates.salaryMax !== undefined) {
      if (Number(updates.salaryMin) > Number(updates.salaryMax)) {
        throw new Error("Minimum salary cannot be greater than maximum salary.");
      }
    }

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
