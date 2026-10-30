import { Request, Response } from "express";
import { companyService } from "../services/CompanyService.js";
import { companyRepository } from "../repositories/CompanyRepository.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { auditLogger } from "../utils/auditLogger.js";
import { logger } from "../utils/logger.js";

export class CompanyController {
  async getCompanies(req: Request, res: Response) {
    try {
      const companies = await companyService.getAllCompanies();
      return sendSuccess(res, { count: companies.length, companies });
    } catch (error: any) {
      logger.error("[Company] getCompanies error:", error);
      return sendError(res, error.message || "Failed to fetch companies", 500);
    }
  }

  async getTopCompanies(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 5;
      const companies = await companyService.getTopCompanies(limit);
      return sendSuccess(res, { count: companies.length, companies });
    } catch (error: any) {
      logger.error("[Company] getTopCompanies error:", error);
      return sendError(res, error.message || "Failed to fetch top companies", 500);
    }
  }

  async getRatings(req: Request, res: Response) {
    try {
      const companyId = req.query.companyId as string;
      const ratings = await companyService.getRatings(companyId);
      return sendSuccess(res, { count: ratings.length, ratings });
    } catch (error: any) {
      logger.error("[Company] getRatings error:", error);
      return sendError(res, error.message || "Failed to fetch ratings", 500);
    }
  }

  async postRating(req: Request, res: Response) {
    try {
      const { companyId, rating, comment, userName } = req.body;
      if (!companyId || !rating) {
        return sendError(res, "companyId and rating (1-5) are required", 400);
      }

      const created = await companyService.addRating({
        companyId,
        rating: Number(rating),
        comment: comment || "",
        userName: userName || "Anonymous Candidate",
        ...req.body,
      });

      return sendSuccess(res, { rating: created, message: "Review submitted successfully." }, 201);
    } catch (error: any) {
      logger.error("[Company] postRating error:", error);
      return sendError(res, error.message || "Failed to submit review", 400);
    }
  }

  async verifyCompany(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const callerRole = (req.user.role || "").toLowerCase();
      if (callerRole !== "admin") {
        return sendError(res, "Forbidden: Only platform administrators can verify companies.", 403);
      }

      const { id } = req.params;
      const verified = req.body.verified !== undefined ? Boolean(req.body.verified) : true;

      const updated = await companyRepository.verifyCompany(id, verified);
      if (!updated) {
        return sendError(res, `Company with ID "${id}" not found`, 404);
      }

      await auditLogger.log({
        req,
        action: "ADMIN_COMPANY_VERIFIED",
        resourceType: "company",
        resourceId: id,
        details: { companyName: updated.name, verified },
        outcome: "SUCCESS",
      });

      return sendSuccess(res, {
        company: updated,
        message: `Company "${updated.name}" verification updated to ${verified}.`,
      });
    } catch (error: any) {
      logger.error("[Company] verifyCompany error:", error);
      return sendError(res, error.message || "Failed to verify company", 500);
    }
  }
}

export const companyController = new CompanyController();
