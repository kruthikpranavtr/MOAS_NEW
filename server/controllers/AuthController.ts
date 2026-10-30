import { Request, Response } from "express";
import { authService } from "../services/AuthService.js";
import { AuthenticatedRequest, extractToken, deleteSession } from "../middleware/auth.js";
import { userService } from "../services/UserService.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { sendSuccess, sendError } from "../utils/response.js";

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return sendError(res, "User ID / email / username and password are required.", 400);
      }

      const authOutcome = await authService.login(identifier, password);
      if (!authOutcome.success || !authOutcome.result) {
        const statusCode = authOutcome.code === "USER_NOT_FOUND" ? 404 : 401;
        return sendError(
          res,
          authOutcome.error || "Incorrect password or user not found. Please verify your credentials.",
          statusCode,
          authOutcome.code || "INVALID_CREDENTIALS"
        );
      }

      const result = authOutcome.result;

      // Configure HttpOnly cookie for session security
      res.cookie("moas_session_token", result.token, {
        httpOnly: true,
        secure: config.app.isProduction,
        sameSite: "lax",
        maxAge: config.auth.sessionTtlMs,
        path: "/",
      });

      return sendSuccess(res, {
        token: result.token,
        user: result.user,
        message: "Authentication successful.",
      });
    } catch (error: any) {
      logger.error("[Auth] Login error:", error);
      return sendError(res, error.message || "Failed to authenticate", 500);
    }
  }

  logout(req: Request, res: Response) {
    const token = extractToken(req);
    if (token) {
      deleteSession(token);
    }
    res.clearCookie("moas_session_token", { path: "/" });
    return sendSuccess(res, { message: "Logged out successfully." });
  }

  async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, "Unauthorized", 401);
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        return sendError(res, "User profile not found.", 404);
      }

      return sendSuccess(res, { user });
    } catch (error: any) {
      logger.error("[Auth] GetMe error:", error);
      return sendError(res, error.message || "Failed to retrieve user profile", 500);
    }
  }
}

export const authController = new AuthController();
