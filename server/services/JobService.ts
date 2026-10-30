import { jobRepository } from "../repositories/JobRepository.js";
import { JobRecord } from "../models/types.js";

export class JobService {
  async getAllJobs(
    filtersOrSearch?: string | { search?: string; category?: string; department?: string; location?: string; employerId?: string },
    dept?: string,
    loc?: string
  ): Promise<JobRecord[]> {
    if (typeof filtersOrSearch === "object" && filtersOrSearch !== null) {
      const search = filtersOrSearch.search;
      const department = filtersOrSearch.department || filtersOrSearch.category;
      const location = filtersOrSearch.location;
      let jobs = await jobRepository.getAll(search, department, location);
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

  async deleteJob(id: string): Promise<boolean> {
    return await jobRepository.delete(id);
  }
}

export const jobService = new JobService();
