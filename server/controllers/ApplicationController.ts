import { Response } from "express";
import { applicationService } from "../services/ApplicationService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class ApplicationController {
  async getApplications(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to view applications", 401);
      }

      const caller = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const candidateId = (req.query.userId || req.query.candidateId) as string;
      const jobId = req.query.jobId as string;
      const status = req.query.status as string;
      const search = req.query.search as string;

      const apps = await applicationService.getApplications(caller, candidateId, jobId, status, search);
      return sendSuccess(res, { count: apps.length, applications: apps });
    } catch (error: any) {
      logger.error("[Application] getApplications error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to fetch applications", statusCode);
    }
  }

  async getApplicationById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to view application", 401);
      }

      const { id } = req.params;
      const caller = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const app = await applicationService.getApplicationById(id, caller);
      if (!app) {
        return sendError(res, `Application with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { application: app });
    } catch (error: any) {
      logger.error("[Application] getApplicationById error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to fetch application", statusCode);
    }
  }

  async getApplicationHistory(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to view application history", 401);
      }

      const { id } = req.params;
      const caller = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const history = await applicationService.getApplicationHistory(id, caller);
      return sendSuccess(res, { count: history.length, history });
    } catch (error: any) {
      logger.error("[Application] getApplicationHistory error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to fetch application history", statusCode);
    }
  }

  async submitApplication(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to apply for jobs", 401);
      }

      const caller = {
        userId: req.user.userId,
        name: req.user.name || req.body.candidateName || "Candidate",
        email: req.user.email || req.body.candidateEmail || "candidate@email.com",
        role: req.user.role,
      };

      const result = await applicationService.submitApplication(req.body, caller);
      return sendSuccess(res, { application: result, message: "Application submitted successfully." }, 201);
    } catch (error: any) {
      logger.error("[Application] submitApplication error:", error);
      const isConflict = error.message.includes("Conflict") || error.message.includes("already submitted") || error.message.includes("already applied");
      const statusCode = error.message.includes("Forbidden")
        ? 403
        : isConflict
        ? 409
        : 400;
      return sendError(res, error.message || "Failed to submit application", statusCode);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to update application status", 401);
      }

      const { id } = req.params;
      const { status, stage, reason } = req.body;
      if (!status) {
        return sendError(res, "Status is required", 400);
      }

      const caller = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const updated = await applicationService.updateStatus(id, status, stage, caller, reason);
      if (!updated) {
        return sendError(res, `Application with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { application: updated, message: "Application status updated successfully." });
    } catch (error: any) {
      logger.error("[Application] updateStatus error:", error);
      const statusCode = error.message.includes("Forbidden")
        ? 403
        : error.message.includes("Invalid status transition")
        ? 400
        : 500;
      return sendError(res, error.message || "Failed to update status", statusCode);
    }
  }

  async withdrawApplication(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to withdraw application", 401);
      }

      const { id } = req.params;
      const caller = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const reason = req.body?.reason;
      const updated = await applicationService.withdrawApplication(id, caller, reason);
      return sendSuccess(res, { application: updated, message: "Application withdrawn successfully." });
    } catch (error: any) {
      logger.error("[Application] withdrawApplication error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to withdraw application", statusCode);
    }
  }

  async deleteApplication(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to delete application", 401);
      }

      const { id } = req.params;
      const caller = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const result = await applicationService.deleteApplication(id, caller);
      if (!result.success) {
        return sendError(res, result.error || "Forbidden", 403);
      }

      return sendSuccess(res, { deleted: true, message: "Application withdrawn/deleted successfully." });
    } catch (error: any) {
      logger.error("[Application] deleteApplication error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to delete application", statusCode);
    }
  }
}

export const applicationController = new ApplicationController();
