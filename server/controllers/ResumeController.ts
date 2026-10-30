import { Response } from "express";
import { resumeService } from "../services/ResumeService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class ResumeController {
  async uploadResume(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, userId, resume } = req.body;
      if (!resume || !resume.name) {
        return sendError(res, "Resume object with name is required", 400);
      }

      const callerSession = {
        userId: req.user!.userId,
        email: req.user!.email,
        role: req.user!.role,
      };

      const result = await resumeService.uploadResume(userId, email, resume, callerSession);
      return sendSuccess(res, {
        resumes: result.resumes,
        user: result.user,
        message: "Resume successfully saved and synchronized.",
      });
    } catch (error: any) {
      logger.error("[Resume] uploadResume error:", error);
      const statusCode = error.message.includes("Access denied") ? 403 : 500;
      return sendError(res, error.message || "Failed to upload resume", statusCode);
    }
  }
}

export const resumeController = new ResumeController();
