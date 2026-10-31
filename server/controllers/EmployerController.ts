import { Response } from "express";
import { employerService } from "../services/EmployerService.js";
import { jobService } from "../services/JobService.js";
import { applicationService } from "../services/ApplicationService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class EmployerController {
  async getDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const callerRole = (req.user.role || "").toLowerCase();
      if (callerRole !== "employer" && callerRole !== "admin") {
        return sendError(res, "Forbidden: Action restricted to Employer accounts.", 403);
      }

      const stats = await employerService.getDashboardStats(req.user.userId);
      return sendSuccess(res, stats);
    } catch (error: any) {
      logger.error("[Employer] getDashboard error:", error);
      return sendError(res, error.message || "Failed to fetch employer dashboard stats", 500);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const callerRole = (req.user.role || "").toLowerCase();
      if (callerRole !== "employer" && callerRole !== "admin") {
        return sendError(res, "Forbidden: Action restricted to Employer accounts.", 403);
      }

      const profile = await employerService.getProfile(req.user.userId);
      return sendSuccess(res, { profile });
    } catch (error: any) {
      logger.error("[Employer] getProfile error:", error);
      return sendError(res, error.message || "Failed to fetch employer profile", 500);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const callerRole = (req.user.role || "").toLowerCase();
      if (callerRole !== "employer" && callerRole !== "admin") {
        return sendError(res, "Forbidden: Action restricted to Employer accounts.", 403);
      }

      const callerSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const updated = await employerService.updateProfile(req.user.userId, req.body, callerSession);
      return sendSuccess(res, { profile: updated, message: "Employer profile updated successfully." });
    } catch (error: any) {
      logger.error("[Employer] updateProfile error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to update employer profile", statusCode);
    }
  }

  async getJobs(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const callerRole = (req.user.role || "").toLowerCase();
      if (callerRole !== "employer" && callerRole !== "admin") {
        return sendError(res, "Forbidden: Action restricted to Employer accounts.", 403);
      }

      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;

      const jobs = await jobService.getEmployerJobs(req.user.userId, status, search);
      return sendSuccess(res, { count: jobs.length, jobs });
    } catch (error: any) {
      logger.error("[Employer] getJobs error:", error);
      return sendError(res, error.message || "Failed to fetch employer jobs", 500);
    }
  }

  async updateJobStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        return sendError(res, "Status is required (open, published, draft, closed, archived).", 400);
      }

      const callerSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const updated = await jobService.updateJobStatus(id, status, callerSession);
      if (!updated) {
        return sendError(res, `Job with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { job: updated, message: `Job status updated to "${status}".` });
    } catch (error: any) {
      logger.error("[Employer] updateJobStatus error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to update job status", statusCode);
    }
  }

  async getApplicants(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const callerRole = (req.user.role || "").toLowerCase();
      if (callerRole !== "employer" && callerRole !== "admin") {
        return sendError(res, "Forbidden: Action restricted to Employer accounts.", 403);
      }

      const jobId = req.query.jobId as string | undefined;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;

      const applicants = await applicationService.getApplications(
        { userId: req.user.userId, role: req.user.role },
        undefined,
        jobId,
        status,
        search
      );

      return sendSuccess(res, { count: applicants.length, applicants });
    } catch (error: any) {
      logger.error("[Employer] getApplicants error:", error);
      return sendError(res, error.message || "Failed to fetch applicants", 500);
    }
  }

  async updateApplicationStage(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const status = req.body.status || req.body.stage;
      const stage = req.body.stage;
      if (!status) {
        return sendError(res, "Status is required", 400);
      }

      const caller = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const updated = await applicationService.updateStatus(id, status, stage, caller);
      if (!updated) {
        return sendError(res, `Application with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { application: updated, message: `Application status updated to "${status}".` });
    } catch (error: any) {
      logger.error("[Employer] updateApplicationStage error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to update stage", statusCode);
    }
  }

  async addRecruiterNotes(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const notes = req.body.notes !== undefined ? req.body.notes : req.body.recruiterNotes;
      if (notes === undefined) {
        return sendError(res, "Notes content is required", 400);
      }

      const caller = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const updated = await applicationService.addRecruiterNotes(id, String(notes), caller);
      if (!updated) {
        return sendError(res, `Application with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { application: updated, message: "Recruiter notes updated successfully." });
    } catch (error: any) {
      logger.error("[Employer] addRecruiterNotes error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to add recruiter notes", statusCode);
    }
  }

  async scheduleInterview(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const scheduledAt = req.body.scheduledAt || req.body.interviewDate || req.body.date;
      const stage = req.body.stage;
      if (!scheduledAt) {
        return sendError(res, "scheduledAt date is required", 400);
      }

      const parsedDate = new Date(scheduledAt);
      if (isNaN(parsedDate.getTime())) {
        return sendError(res, "Invalid scheduledAt date format", 400);
      }

      const caller = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const updated = await applicationService.scheduleInterview(
        id,
        parsedDate,
        stage || "Interview Scheduled",
        caller
      );

      if (!updated) {
        return sendError(res, `Application with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { application: updated, message: "Interview scheduled successfully." });
    } catch (error: any) {
      logger.error("[Employer] scheduleInterview error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to schedule interview", statusCode);
    }
  }
}

export const employerController = new EmployerController();
