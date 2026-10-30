import { Request, Response } from "express";
import { authService } from "../services/AuthService.js";
import { passwordResetService } from "../services/PasswordResetService.js";
import { emailVerificationService } from "../services/EmailVerificationService.js";
import {
  AuthenticatedRequest,
  extractToken,
  setSessionCookie,
  clearSessionCookie,
} from "../middleware/auth.js";
import { userService } from "../services/UserService.js";
import { logger } from "../utils/logger.js";
import { sendSuccess, sendError } from "../utils/response.js";

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return sendError(res, "Name, email, and password are required.", 400);
      }

      const result = await authService.register(req.body);

      // Set HttpOnly session cookie
      setSessionCookie(res, result.token, false);

      return sendSuccess(
        res,
        {
          token: result.token,
          user: result.user,
          message: "Account registered successfully.",
        },
        201
      );
    } catch (error: any) {
      logger.error("[Auth] Register error:", error?.message);
      const statusCode = error.message.includes("already registered") || error.message.includes("already taken")
        ? 409
        : 400;
      return sendError(res, error.message || "Failed to register account", statusCode);
    }
  }

  async login(req: Request, res: Response) {
    try {
      const identifier = req.body.identifier || req.body.username || req.body.email || req.body.userId;
      const { password, rememberMe } = req.body;
      if (!identifier || !password) {
        return sendError(res, "User ID / email / username and password are required.", 400);
      }

      const authOutcome = await authService.login(identifier, password, !!rememberMe);
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

      // Set HttpOnly session cookie with rememberMe configuration
      setSessionCookie(res, result.token, !!rememberMe);

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

  async logout(req: Request, res: Response) {
    try {
      const { token } = extractToken(req);
      if (token) {
        await authService.logout(token);
      }
      clearSessionCookie(res);
      return sendSuccess(res, { message: "Logged out successfully." });
    } catch (error: any) {
      logger.error("[Auth] Logout error:", error);
      clearSessionCookie(res);
      return sendSuccess(res, { message: "Logged out." });
    }
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

      return sendSuccess(res, { user, session: req.user });
    } catch (error: any) {
      logger.error("[Auth] GetMe error:", error);
      return sendError(res, error.message || "Failed to retrieve user profile", 500);
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const identifier = req.body.identifier || req.body.email || req.body.username;
      if (!identifier) {
        return sendError(res, "Email or username is required.", 400);
      }

      const result = await passwordResetService.requestPasswordReset(identifier);
      return sendSuccess(res, result);
    } catch (error: any) {
      logger.error("[Auth] ForgotPassword error:", error?.message);
      return sendError(res, error.message || "Failed to process password reset request", 400);
    }
  }

  async verifyResetToken(req: Request, res: Response) {
    try {
      const token = (req.params.token || req.query.token || req.body.token) as string;
      const result = await passwordResetService.verifyResetToken(token);
      if (!result.valid) {
        return sendError(res, result.message, 400, "INVALID_TOKEN");
      }
      return sendSuccess(res, result);
    } catch (error: any) {
      logger.error("[Auth] VerifyResetToken error:", error?.message);
      return sendError(res, error.message || "Failed to verify reset token", 400);
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword, confirmPassword } = req.body;
      if (!token || !newPassword) {
        return sendError(res, "Reset token and new password are required.", 400);
      }

      const result = await passwordResetService.resetPassword(token, newPassword, confirmPassword);
      clearSessionCookie(res);
      return sendSuccess(res, result);
    } catch (error: any) {
      logger.error("[Auth] ResetPassword error:", error?.message);
      return sendError(res, error.message || "Failed to reset password", 400);
    }
  }

  async sendEmailVerification(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, "Authentication required.", 401);
      }

      const result = await emailVerificationService.sendVerificationEmail(userId);
      return sendSuccess(res, result);
    } catch (error: any) {
      logger.error("[Auth] SendEmailVerification error:", error?.message);
      return sendError(res, error.message || "Failed to send verification email", 400);
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const token = (req.body.token || req.params.token || req.query.token) as string;
      if (!token) {
        return sendError(res, "Verification token is required.", 400);
      }

      const result = await emailVerificationService.verifyEmail(token);
      return sendSuccess(res, result);
    } catch (error: any) {
      logger.error("[Auth] VerifyEmail error:", error?.message);
      return sendError(res, error.message || "Failed to verify email", 400);
    }
  }
}

export const authController = new AuthController();
