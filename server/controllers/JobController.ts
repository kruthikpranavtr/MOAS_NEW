import { Request, Response } from "express";
import { jobService } from "../services/JobService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class JobController {
  async getAllJobs(req: Request, res: Response) {
    try {
      const filters = {
        category: req.query.category as string,
        location: req.query.location as string,
        search: req.query.search as string,
        employerId: req.query.employerId as string,
      };
      const jobs = await jobService.getAllJobs(filters);
      return sendSuccess(res, { count: jobs.length, jobs });
    } catch (error: any) {
      logger.error("[Job] getAllJobs error:", error);
      return sendError(res, error.message || "Failed to fetch jobs", 500);
    }
  }

  async getJobById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const job = await jobService.getJobById(id);
      if (!job) {
        return sendError(res, `Job with ID "${id}" not found`, 404);
      }
      return sendSuccess(res, { job });
    } catch (error: any) {
      logger.error("[Job] getJobById error:", error);
      return sendError(res, error.message || "Failed to fetch job", 500);
    }
  }

  async createJob(req: AuthenticatedRequest, res: Response) {
    try {
      const callerId = req.user!.userId;
      const jobData = {
        ...req.body,
        employerId: callerId, // Verified from session, not untrusted request body
      };

      const created = await jobService.createJob(jobData);
      return sendSuccess(res, { job: created, message: "Job posted successfully." }, 201);
    } catch (error: any) {
      logger.error("[Job] createJob error:", error);
      return sendError(res, error.message || "Failed to create job", 400);
    }
  }

  async deleteJob(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const callerId = req.user!.userId;
      const callerRole = req.user!.role;

      const existing = await jobService.getJobById(id);
      if (!existing) {
        return sendError(res, `Job with ID "${id}" not found`, 404);
      }

      // Enforce ownership: only the employer who posted or an Admin can delete
      if (existing.employerId && existing.employerId !== callerId && callerRole !== "Admin") {
        return sendError(res, "Forbidden: You are not authorized to delete this job listing.", 403);
      }

      const deleted = await jobService.deleteJob(id);
      return sendSuccess(res, { deleted, message: "Job deleted successfully." });
    } catch (error: any) {
      logger.error("[Job] deleteJob error:", error);
      return sendError(res, error.message || "Failed to delete job", 500);
    }
  }
}

export const jobController = new JobController();
