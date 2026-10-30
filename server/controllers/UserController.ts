import { Request, Response } from "express";
import { userService } from "../services/UserService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import { UserRole } from "../models/types.js";

export class UserController {
  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await userService.getAllUsers();
      return sendSuccess(res, { count: users.length, users });
    } catch (error: any) {
      logger.error("[User] getAllUsers error:", error);
      return sendError(res, error.message || "Failed to fetch users", 500);
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      if (!user) {
        return sendError(res, `User with ID "${id}" not found`, 404);
      }
      return sendSuccess(res, { user });
    } catch (error: any) {
      logger.error("[User] getUserById error:", error);
      return sendError(res, error.message || "Failed to fetch user", 500);
    }
  }

  async registerUser(req: Request, res: Response) {
    try {
      const { email, id, username } = req.body;
      if (!email && !id && !username) {
        return sendError(res, "Email, username, or user ID is required to register", 400);
      }

      const result = await userService.registerUser(req.body);

      return sendSuccess(
        res,
        {
          token: result.token,
          user: result.user,
          message: "Account registered successfully.",
        },
        200
      );
    } catch (error: any) {
      logger.error("[User] registerUser error:", error);
      const statusCode = error.message.includes("already registered") ? 409 : 400;
      return sendError(res, error.message || "Failed to register user", statusCode);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const targetId = req.params.id;
      const callerId = req.user?.userId;
      const callerRole = (req.user?.role || "").toLowerCase();

      // Ownership enforcement: user can only modify their own profile unless Admin
      if (callerId !== targetId && callerRole !== "admin") {
        return sendError(res, "Forbidden: You cannot modify another user's profile. You can only manage your own account.", 403);
      }

      const caller = {
        userId: callerId!,
        role: req.user!.role,
      };

      const updated = await userService.updateProfile(targetId, req.body, caller);
      if (!updated) {
        return sendError(res, `User with ID "${targetId}" not found`, 404);
      }

      return sendSuccess(res, {
        user: updated,
        message: "Profile updated successfully.",
      });
    } catch (error: any) {
      logger.error("[User] updateProfile error:", error);
      return sendError(res, error.message || "Failed to update profile", 500);
    }
  }

  async updateUserRole(req: AuthenticatedRequest, res: Response) {
    try {
      const targetId = req.params.id;
      const { role } = req.body;

      if (!role) {
        return sendError(res, "Role is required.", 400);
      }

      const caller = {
        userId: req.user!.userId,
        email: req.user!.email,
        role: req.user!.role,
      };

      const updated = await userService.updateUserRole(targetId, role as UserRole, caller);
      return sendSuccess(res, {
        user: updated,
        message: `User role updated successfully to "${role}".`,
      });
    } catch (error: any) {
      logger.error("[User] updateUserRole error:", error);
      const statusCode = error.message.includes("not found") ? 404 : 400;
      return sendError(res, error.message || "Failed to update user role", statusCode);
    }
  }

  async updatePhoto(req: AuthenticatedRequest, res: Response) {
    try {
      const { photoUrl } = req.body;
      if (!photoUrl) {
        return sendError(res, "photoUrl is required.", 400);
      }

      const userId = req.user!.userId;
      const updated = await userService.updatePhoto(userId, photoUrl);
      if (!updated) {
        return sendError(res, "User not found to update photo.", 404);
      }

      return sendSuccess(res, {
        avatarUrl: photoUrl,
        user: updated,
        message: "Profile photo updated successfully.",
      });
    } catch (error: any) {
      logger.error("[User] updatePhoto error:", error);
      return sendError(res, error.message || "Failed to update photo", 500);
    }
  }
}

export const userController = new UserController();
