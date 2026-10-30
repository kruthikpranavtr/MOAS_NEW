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

  async createAlert(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to create job alerts.", 401);
      }

      const callerId = req.user.userId;
      const created = await jobAlertService.createAlert({
        ...req.body,
        userId: callerId, // Verified from authenticated session
      });
      return sendSuccess(res, { alert: created, message: "Alert created successfully." }, 201);
    } catch (error: any) {
      logger.error("[JobAlert] createAlert error:", error);
      return sendError(res, error.message || "Failed to create alert", 400);
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
}

export const jobAlertController = new JobAlertController();
