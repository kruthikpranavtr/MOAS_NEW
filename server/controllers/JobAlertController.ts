import { Request, Response } from "express";
import { jobAlertService } from "../services/JobAlertService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class JobAlertController {
  async getAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId || (req.query.userId as string) || "anonymous";
      const alerts = await jobAlertService.getAlerts(userId);
      return sendSuccess(res, { count: alerts.length, alerts });
    } catch (error: any) {
      logger.error("[JobAlert] getAlerts error:", error);
      return sendError(res, error.message || "Failed to fetch alerts", 500);
    }
  }

  async createAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId || req.body.userId || "anonymous";
      const created = await jobAlertService.createAlert({
        ...req.body,
        userId,
      });
      return sendSuccess(res, { alert: created, message: "Alert created successfully." }, 201);
    } catch (error: any) {
      logger.error("[JobAlert] createAlert error:", error);
      return sendError(res, error.message || "Failed to create alert", 400);
    }
  }

  async deleteAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await jobAlertService.deleteAlert(id);
      return sendSuccess(res, { deleted, message: "Alert deleted successfully." });
    } catch (error: any) {
      logger.error("[JobAlert] deleteAlert error:", error);
      return sendError(res, error.message || "Failed to delete alert", 500);
    }
  }
}

export const jobAlertController = new JobAlertController();
