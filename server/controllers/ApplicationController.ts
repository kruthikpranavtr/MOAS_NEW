import { Request, Response } from "express";
import { applicationService } from "../services/ApplicationService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class ApplicationController {
  async getApplications(req: Request, res: Response) {
    try {
      const candidateId = (req.query.userId || req.query.candidateId) as string;
      const apps = await applicationService.getApplications(candidateId);
      return sendSuccess(res, { count: apps.length, applications: apps });
    } catch (error: any) {
      logger.error("[Application] getApplications error:", error);
      return sendError(res, error.message || "Failed to fetch applications", 500);
    }
  }

  async submitApplication(req: AuthenticatedRequest, res: Response) {
    try {
      const caller = {
        userId: req.user!.userId,
        name: req.user!.name || req.body.candidateName || "Candidate",
        email: req.user!.email || req.body.candidateEmail || "candidate@email.com",
      };

      const result = await applicationService.submitApplication(req.body, caller);
      return sendSuccess(res, { application: result, message: "Application submitted successfully." }, 201);
    } catch (error: any) {
      logger.error("[Application] submitApplication error:", error);
      const statusCode = error.message.includes("already applied") ? 409 : 400;
      return sendError(res, error.message || "Failed to submit application", statusCode);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, stage } = req.body;
      if (!status) {
        return sendError(res, "Status is required", 400);
      }

      const updated = await applicationService.updateStatus(id, status, stage);
      if (!updated) {
        return sendError(res, `Application with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { application: updated, message: "Application status updated successfully." });
    } catch (error: any) {
      logger.error("[Application] updateStatus error:", error);
      return sendError(res, error.message || "Failed to update status", 500);
    }
  }

  async deleteApplication(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const caller = {
        userId: req.user!.userId,
        role: req.user!.role,
      };

      const result = await applicationService.deleteApplication(id, caller);
      if (!result.success) {
        return sendError(res, result.error || "Forbidden", 403);
      }

      return sendSuccess(res, { deleted: true, message: "Application withdrawn/deleted successfully." });
    } catch (error: any) {
      logger.error("[Application] deleteApplication error:", error);
      return sendError(res, error.message || "Failed to delete application", 500);
    }
  }
}

export const applicationController = new ApplicationController();
