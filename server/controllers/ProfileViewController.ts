import { Request, Response } from "express";
import { profileViewService } from "../services/ProfileViewService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class ProfileViewController {
  async getViews(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to view profile viewer analytics.", 401);
      }

      const callerId = req.user.userId;
      const callerRole = (req.user.role || "").toLowerCase();
      const requestedUserId = req.query.userId as string | undefined;

      // Ownership enforcement: cannot view another user's profile view history
      if (requestedUserId && requestedUserId !== callerId && callerRole !== "admin") {
        return sendError(res, "Forbidden: You can only view your own profile visitor analytics.", 403);
      }

      const targetUserId = callerRole === "admin" && requestedUserId ? requestedUserId : callerId;
      const data = await profileViewService.getViews(targetUserId);
      return sendSuccess(res, data);
    } catch (error: any) {
      logger.error("[ProfileView] getViews error:", error);
      return sendError(res, error.message || "Failed to fetch profile views", 500);
    }
  }

  async recordView(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const viewData = {
        ...req.body,
        viewerId: authReq.user?.userId || req.body.viewerId,
        viewerName: authReq.user?.name || req.body.viewerName || "Platform Visitor",
        viewerRole: authReq.user?.role || req.body.viewerRole,
      };

      const recorded = await profileViewService.recordView(viewData);
      return sendSuccess(res, { view: recorded, message: "Profile view recorded." }, 201);
    } catch (error: any) {
      logger.error("[ProfileView] recordView error:", error);
      return sendError(res, error.message || "Failed to record profile view", 500);
    }
  }

  async resetViews(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to reset profile views.", 401);
      }

      const callerId = req.user.userId;
      const callerRole = (req.user.role || "").toLowerCase();
      const requestedUserId = (req.body.userId as string) || undefined;

      if (requestedUserId && requestedUserId !== callerId && callerRole !== "admin") {
        return sendError(res, "Forbidden: You can only reset your own profile visitor analytics.", 403);
      }

      const targetUserId = callerRole === "admin" && requestedUserId ? requestedUserId : callerId;
      const cleared = await profileViewService.clearViews(targetUserId);
      return sendSuccess(res, { cleared, message: "Profile views reset successfully." });
    } catch (error: any) {
      logger.error("[ProfileView] resetViews error:", error);
      return sendError(res, error.message || "Failed to reset profile views", 500);
    }
  }
}

export const profileViewController = new ProfileViewController();
