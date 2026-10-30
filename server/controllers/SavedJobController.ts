import { Response } from "express";
import { savedJobService } from "../services/SavedJobService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class SavedJobController {
  async getSavedJobs(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId || (req.query.userId as string) || "anonymous";
      const savedJobs = await savedJobService.getSavedJobs(userId);
      return sendSuccess(res, { count: savedJobs.length, savedJobs });
    } catch (error: any) {
      logger.error("[SavedJob] getSavedJobs error:", error);
      return sendError(res, error.message || "Failed to fetch saved jobs", 500);
    }
  }

  async toggleSavedJob(req: AuthenticatedRequest, res: Response) {
    try {
      const callerId = req.user!.userId;
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
