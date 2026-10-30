import { Request, Response } from "express";
import { userService } from "../services/UserService.js";
import { AuthenticatedRequest, setSessionCookie } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

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
      const { name, email, role, phone, username, password } = req.body;
      if (!name || !email || !role) {
        return sendError(res, "Name, email, and role are required.", 400);
      }

      const result = await userService.registerUser({
        name,
        email,
        role,
        phone,
        username,
        password,
        ...req.body,
      });

      setSessionCookie(res, result.token, false);

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
      const callerRole = req.user?.role;

      // Ownership enforcement: user can only modify their own profile unless Admin
      if (callerId !== targetId && callerRole !== "Admin") {
        return sendError(res, "Forbidden: You cannot modify another user's profile. You can only manage your own account.", 403);
      }

      const updated = await userService.updateProfile(targetId, req.body);
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
