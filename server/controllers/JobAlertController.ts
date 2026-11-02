import { Response } from "express";
import { jobAlertService } from "../services/JobAlertService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class JobAlertController {
  async getAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to view job alerts.", 401);
      }

      const callerId = req.user.userId;
      const callerRole = (req.user.role || "").toLowerCase();
      const requestedUserId = req.query.userId as string | undefined;

      // Cross-user isolation: Candidate cannot view another user's alerts
      if (requestedUserId && requestedUserId !== callerId && callerRole !== "admin") {
        return sendError(res, "Forbidden: You can only view your own job alerts.", 403);
      }

      const targetUserId = callerRole === "admin" && requestedUserId ? requestedUserId : callerId;
      const alerts = await jobAlertService.getAlerts(targetUserId);
      return sendSuccess(res, { count: alerts.length, alerts });
    } catch (error: any) {
      logger.error("[JobAlert] getAlerts error:", error);
      return sendError(res, error.message || "Failed to fetch alerts", 500);
    }
  }

  async getAlertById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to view job alert.", 401);
      }

      const { id } = req.params;
      const caller = { userId: req.user.userId, role: req.user.role };
      const alert = await jobAlertService.getAlertById(id, caller);
      if (!alert) {
        return sendError(res, `Alert with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { alert });
    } catch (error: any) {
      logger.error("[JobAlert] getAlertById error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to fetch alert", statusCode);
    }
  }

  async createAlert(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to create job alerts.", 401);
      }

      const callerId = req.user.userId;
      const caller = { userId: callerId, role: req.user.role };
      const created = await jobAlertService.createAlert(
        {
          ...req.body,
          userId: callerId,
        },
        caller
      );
      return sendSuccess(res, { alert: created, message: "Alert created successfully." }, 201);
    } catch (error: any) {
      logger.error("[JobAlert] createAlert error:", error);
      return sendError(res, error.message || "Failed to create alert", 400);
    }
  }

  async updateAlert(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to update job alert.", 401);
      }

      const { id } = req.params;
      const caller = { userId: req.user.userId, role: req.user.role };
      const updated = await jobAlertService.updateAlert(id, req.body, caller);
      if (!updated) {
        return sendError(res, `Alert with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { alert: updated, message: "Alert updated successfully." });
    } catch (error: any) {
      logger.error("[JobAlert] updateAlert error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to update alert", statusCode);
    }
  }

  async toggleAlert(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to modify job alert.", 401);
      }

      const { id } = req.params;
      const caller = { userId: req.user.userId, role: req.user.role };
      const updated = await jobAlertService.toggleAlert(id, caller);
      if (!updated) {
        return sendError(res, `Alert with ID "${id}" not found`, 404);
      }

      const statusText = updated.active ? "resumed" : "paused";
      return sendSuccess(res, { alert: updated, message: `Alert ${statusText} successfully.` });
    } catch (error: any) {
      logger.error("[JobAlert] toggleAlert error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to toggle alert", statusCode);
    }
  }

  async deleteAlert(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to delete job alert.", 401);
      }

      const { id } = req.params;
      const caller = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const deleted = await jobAlertService.deleteAlert(id, caller);
      if (!deleted) {
        return sendError(res, `Alert with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { deleted, message: "Alert deleted successfully." });
    } catch (error: any) {
      logger.error("[JobAlert] deleteAlert error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to delete alert", statusCode);
    }
  }

  async processAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      const stats = await jobAlertService.processJobAlerts();
      return sendSuccess(res, { stats, message: "Job alert matching completed." });
    } catch (error: any) {
      logger.error("[JobAlert] processAlerts error:", error);
      return sendError(res, error.message || "Failed to process job alerts", 500);
    }
  }
}

export const jobAlertController = new JobAlertController();
