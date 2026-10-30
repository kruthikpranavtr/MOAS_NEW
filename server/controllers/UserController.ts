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
      const file = (req as any).file;
      const { photoUrl } = req.body;
      const userId = req.user!.userId;

      // 1. Binary upload via multer
      if (file && file.buffer) {
        const result = await userService.uploadPhoto(userId, file.buffer);
        return sendSuccess(res, {
          avatarUrl: result.avatarUrl,
          user: result.user,
          completeness: result.completeness,
          message: "Profile photo securely uploaded and saved in storage.",
        });
      }

      // 2. Base64 dataUrl upload (e.g. from camera snapshot or drop zone)
      if (photoUrl && photoUrl.startsWith("data:image/")) {
        const base64Data = photoUrl.split(",")[1] || photoUrl;
        const buffer = Buffer.from(base64Data, "base64");
        const result = await userService.uploadPhoto(userId, buffer);
        return sendSuccess(res, {
          avatarUrl: result.avatarUrl,
          user: result.user,
          completeness: result.completeness,
          message: "Profile photo securely converted, uploaded, and saved.",
        });
      }

      // 3. Simple preset URL selection
      if (photoUrl) {
        const updated = await userService.updatePhoto(userId, photoUrl);
        if (!updated) {
          return sendError(res, "User not found to update photo.", 404);
        }
        const completeness = await userService.getProfileCompleteness(userId);
        return sendSuccess(res, {
          avatarUrl: photoUrl,
          user: updated,
          completeness,
          message: "Profile photo preset applied.",
        });
      }

      return sendError(res, "Please provide an image file or photoUrl.", 400);
    } catch (error: any) {
      logger.error("[User] updatePhoto error:", error);
      const msg = error.message || "";
      const statusCode = msg.includes("limit") || msg.includes("Invalid") ? 400 : 500;
      return sendError(res, msg || "Failed to update photo", statusCode);
    }
  }

  async removePhoto(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const result = await userService.removePhoto(userId);
      return sendSuccess(res, {
        user: result.user,
        completeness: result.completeness,
        message: "Profile photo removed successfully.",
      });
    } catch (error: any) {
      logger.error("[User] removePhoto error:", error);
      return sendError(res, error.message || "Failed to remove photo", 500);
    }
  }

  async getPhoto(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      if (!user) {
        return res.status(404).send("User not found");
      }

      const { readAvatarFile } = await import("../utils/storage.js");
      const pathModule = await import("path");

      if (user.avatarStorageKey) {
        const buffer = await readAvatarFile(user.avatarStorageKey);
        if (buffer) {
          const ext = pathModule.default.extname(user.avatarStorageKey).toLowerCase();
          const contentType =
            ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
          res.setHeader("Content-Type", contentType);
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("Cache-Control", "public, max-age=86400");
          return res.send(buffer);
        }
      }

      // If user has external avatar URL (preset or unspash), redirect or fallback
      if (user.avatarUrl && (user.avatarUrl.startsWith("http://") || user.avatarUrl.startsWith("https://"))) {
        return res.redirect(user.avatarUrl);
      }

      return res.status(404).send("Avatar not found");
    } catch (error: any) {
      logger.error("[User] getPhoto error:", error);
      return res.status(500).send("Failed to serve photo");
    }
  }

  async getCandidateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const callerId = req.user?.userId;
      const callerRole = (req.user?.role || "").toLowerCase();

      // Candidates can view own profile; Employers and Admins can view candidates
      if (callerRole !== "admin" && callerRole !== "employer" && callerId !== id) {
        return sendError(res, "Forbidden: Access denied.", 403);
      }

      const profile = await userService.getCandidateProfile(id);
      const user = await userService.getUserById(id);
      const completeness = await userService.getProfileCompleteness(id);

      return sendSuccess(res, {
        profile,
        user,
        completeness,
      });
    } catch (error: any) {
      logger.error("[User] getCandidateProfile error:", error);
      return sendError(res, error.message || "Failed to fetch candidate profile", 500);
    }
  }

  async updateCandidateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const caller = {
        userId: req.user!.userId,
        role: req.user!.role,
      };

      const result = await userService.updateCandidateProfile(id, req.body, caller);
      return sendSuccess(res, {
        profile: result.profile,
        user: result.user,
        completeness: result.completeness,
        message: "Candidate profile successfully updated and saved in PostgreSQL.",
      });
    } catch (error: any) {
      logger.error("[User] updateCandidateProfile error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to update candidate profile", statusCode);
    }
  }

  async getCompleteness(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const completeness = await userService.getProfileCompleteness(id);
      return sendSuccess(res, { completeness });
    } catch (error: any) {
      logger.error("[User] getCompleteness error:", error);
      return sendError(res, error.message || "Failed to calculate profile completeness", 500);
    }
  }
}

export const userController = new UserController();
