import { Response } from "express";
import { auditLogRepository } from "../repositories/AuditLogRepository.js";
import { userService } from "../services/UserService.js";
import { companyRepository } from "../repositories/CompanyRepository.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { auditLogger } from "../utils/auditLogger.js";
import { logger } from "../utils/logger.js";
import { UserRole } from "../models/types.js";

export class AdminController {
  async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const filters = {
        action: req.query.action as string | undefined,
        actorId: req.query.actorId as string | undefined,
        resourceType: req.query.resourceType as string | undefined,
      };

      const logs = await auditLogRepository.getRecent(limit, filters);
      return sendSuccess(res, { count: logs.length, logs });
    } catch (error: any) {
      logger.error("[Admin] getAuditLogs error:", error);
      return sendError(res, error.message || "Failed to fetch audit logs", 500);
    }
  }

  async updateUserRole(req: AuthenticatedRequest, res: Response) {
    try {
      const targetId = req.params.id;
      const { role } = req.body;

      if (!role) {
        return sendError(res, "Role is required (Candidate, Employer, Admin).", 400);
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
      logger.error("[Admin] updateUserRole error:", error);
      const statusCode = error.message.includes("not found") ? 404 : 400;
      return sendError(res, error.message || "Failed to update user role", statusCode);
    }
  }

  async verifyCompany(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const status = req.body.status || (req.body.verified !== undefined ? (req.body.verified ? "verified" : "rejected") : "verified");
      const notes = req.body.notes || req.body.verificationNotes;

      const adminSession = {
        userId: req.user!.userId,
        role: req.user!.role,
        email: req.user!.email,
      };

      const { companyService } = await import("../services/CompanyService.js");
      const updated = await companyService.updateVerificationStatus(id, status, notes, adminSession);

      return sendSuccess(res, {
        company: updated,
        message: `Company "${updated.name}" verification status updated to "${updated.verificationStatus}".`,
      });
    } catch (error: any) {
      logger.error("[Admin] verifyCompany error:", error);
      const statusCode = error.message.includes("not found") ? 404 : 400;
      return sendError(res, error.message || "Failed to verify company", statusCode);
    }
  }
}

export const adminController = new AdminController();
