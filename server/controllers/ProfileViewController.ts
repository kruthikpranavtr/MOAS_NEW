import { Request, Response } from "express";
import { profileViewService } from "../services/ProfileViewService.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class ProfileViewController {
  async getViews(req: Request, res: Response) {
    try {
      const userId = (req.query.userId as string) || undefined;
      const data = await profileViewService.getViews(userId);
      return sendSuccess(res, data);
    } catch (error: any) {
      logger.error("[ProfileView] getViews error:", error);
      return sendError(res, error.message || "Failed to fetch profile views", 500);
    }
  }

  async recordView(req: Request, res: Response) {
    try {
      const recorded = await profileViewService.recordView(req.body);
      return sendSuccess(res, { view: recorded, message: "Profile view recorded." }, 201);
    } catch (error: any) {
      logger.error("[ProfileView] recordView error:", error);
      return sendError(res, error.message || "Failed to record profile view", 500);
    }
  }

  async resetViews(req: Request, res: Response) {
    try {
      const userId = (req.body.userId as string) || undefined;
      const cleared = await profileViewService.clearViews(userId);
      return sendSuccess(res, { cleared, message: "Profile views reset successfully." });
    } catch (error: any) {
      logger.error("[ProfileView] resetViews error:", error);
      return sendError(res, error.message || "Failed to reset profile views", 500);
    }
  }
}

export const profileViewController = new ProfileViewController();
