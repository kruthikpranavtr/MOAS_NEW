import { Response } from "express";
import { savedJobService } from "../services/SavedJobService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class SavedJobController {
  async getSavedJobs(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to view saved jobs.", 401);
      }

      const callerId = req.user.userId;
      const callerRole = (req.user.role || "").toLowerCase();
      const requestedUserId = req.query.userId as string | undefined;

      // Cross-user isolation: Candidate cannot view another user's saved jobs
      if (requestedUserId && requestedUserId !== callerId && callerRole !== "admin") {
        return sendError(res, "Forbidden: You can only view your own saved jobs.", 403);
      }

      const targetUserId = callerRole === "admin" && requestedUserId ? requestedUserId : callerId;
      const savedJobs = await savedJobService.getSavedJobs(targetUserId);
      return sendSuccess(res, { count: savedJobs.length, savedJobs });
    } catch (error: any) {
      logger.error("[SavedJob] getSavedJobs error:", error);
      return sendError(res, error.message || "Failed to fetch saved jobs", 500);
    }
  }

  async toggleSavedJob(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to save jobs.", 401);
      }

      const callerId = req.user.userId;
      const { jobId } = req.body;
      if (!jobId) {
        return sendError(res, "jobId is required", 400);
      }

      const result = await savedJobService.toggleSavedJob(callerId, jobId);
      return sendSuccess(res, result);
    } catch (error: any) {
      logger.error("[SavedJob] toggleSavedJob error:", error);
      return sendError(res, error.message || "Failed to toggle saved job", 500);
    }
  }
}

export const savedJobController = new SavedJobController();
