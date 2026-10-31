import { Request, Response } from "express";
import { companyService } from "../services/CompanyService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class CompanyController {
  async getCompanies(req: Request, res: Response) {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        industry: req.query.industry as string | undefined,
        location: req.query.location as string | undefined,
        size: (req.query.size || req.query.companySize) as string | undefined,
        verifiedOnly: req.query.verifiedOnly === "true",
        verificationStatus: req.query.verificationStatus as string | undefined,
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
      };

      const pagination = {
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      };

      const result = await companyService.searchCompanies(filters, pagination);
      return sendSuccess(res, {
        count: result.companies.length,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        companies: result.companies,
      });
    } catch (error: any) {
      logger.error("[Company] getCompanies error:", error);
      return sendError(res, error.message || "Failed to fetch companies", 500);
    }
  }

  async getTopCompanies(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 5;
      const companies = await companyService.getTopCompanies(0, limit);
      return sendSuccess(res, { count: companies.length, companies });
    } catch (error: any) {
      logger.error("[Company] getTopCompanies error:", error);
      return sendError(res, error.message || "Failed to fetch top companies", 500);
    }
  }

  async getCompanyById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const company = await companyService.getCompanyById(id);
      if (!company) {
        return sendError(res, `Company with ID "${id}" not found`, 404);
      }
      return sendSuccess(res, { company });
    } catch (error: any) {
      logger.error("[Company] getCompanyById error:", error);
      return sendError(res, error.message || "Failed to fetch company", 500);
    }
  }

  async createCompany(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const creatorSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const created = await companyService.createCompany(req.body, creatorSession);
      return sendSuccess(res, { company: created, message: "Company profile created successfully." }, 201);
    } catch (error: any) {
      logger.error("[Company] createCompany error:", error);
      const statusCode = error.message.includes("Forbidden")
        ? 403
        : error.message.includes("already exists")
        ? 409
        : 400;
      return sendError(res, error.message || "Failed to create company", statusCode);
    }
  }

  async updateCompany(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const callerSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const updated = await companyService.updateCompany(id, req.body, callerSession);
      return sendSuccess(res, { company: updated, message: "Company profile updated successfully." });
    } catch (error: any) {
      logger.error("[Company] updateCompany error:", error);
      const statusCode = error.message.includes("Forbidden")
        ? 403
        : error.message.includes("not found")
        ? 404
        : 400;
      return sendError(res, error.message || "Failed to update company", statusCode);
    }
  }

  async archiveCompany(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const callerSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const archived = await companyService.archiveCompany(id, callerSession);
      if (!archived) {
        return sendError(res, `Company with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { company: archived, message: "Company archived successfully." });
    } catch (error: any) {
      logger.error("[Company] archiveCompany error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to archive company", statusCode);
    }
  }

  async getMembers(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const members = await companyService.getMembers(id, {
        userId: req.user.userId,
        role: req.user.role,
      });

      return sendSuccess(res, { count: members.length, members });
    } catch (error: any) {
      logger.error("[Company] getMembers error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to fetch company members", statusCode);
    }
  }

  async inviteRecruiter(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const { email, role } = req.body;
      if (!email) {
        return sendError(res, "Email address is required for recruiter invitation.", 400);
      }

      const callerSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const result = await companyService.inviteRecruiter(id, email, role || "recruiter", callerSession);
      return sendSuccess(
        res,
        {
          invitation: result.invitation,
          invitationToken: result.invitationToken,
          message: `Invitation sent to ${email}.`,
        },
        201
      );
    } catch (error: any) {
      logger.error("[Company] inviteRecruiter error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to invite recruiter", statusCode);
    }
  }

  async acceptInvitation(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to accept invitation.", 401);
      }

      const { token } = req.body;
      if (!token) {
        return sendError(res, "Invitation token is required.", 400);
      }

      const userSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const accepted = await companyService.acceptInvitation(token, userSession);
      return sendSuccess(res, {
        membership: accepted,
        message: "You have joined the company hiring team successfully.",
      });
    } catch (error: any) {
      logger.error("[Company] acceptInvitation error:", error);
      const statusCode = error.message.includes("Invalid or expired") ? 400 : 500;
      return sendError(res, error.message || "Failed to accept invitation", statusCode);
    }
  }

  async updateMemberRole(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id, userId } = req.params;
      const { role } = req.body;
      if (!role) {
        return sendError(res, "Role is required (admin, recruiter, member).", 400);
      }

      const callerSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const updated = await companyService.updateMemberRole(id, userId, role, callerSession);
      return sendSuccess(res, {
        member: updated,
        message: `Member role updated to "${role}".`,
      });
    } catch (error: any) {
      logger.error("[Company] updateMemberRole error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to update member role", statusCode);
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id, userId } = req.params;
      const callerSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const result = await companyService.removeMember(id, userId, callerSession);
      return sendSuccess(res, { ...result, message: "Member removed from company successfully." });
    } catch (error: any) {
      logger.error("[Company] removeMember error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to remove member", statusCode);
    }
  }

  async transferOwnership(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const newOwnerId = req.body.newOwnerId || req.body.newOwnerUserId;
      if (!newOwnerId) {
        return sendError(res, "newOwnerId is required.", 400);
      }

      const callerSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const result = await companyService.transferOwnership(id, newOwnerId, callerSession);
      return sendSuccess(res, {
        ...result,
        message: `Company ownership transferred successfully.`,
      });
    } catch (error: any) {
      logger.error("[Company] transferOwnership error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to transfer ownership", statusCode);
    }
  }

  async uploadLogo(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const file = (req as any).file;
      if (!file) {
        return sendError(res, "Image file is required (field name: 'logo' or 'file').", 400);
      }

      const callerSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const result = await companyService.uploadLogo(
        id,
        file.buffer,
        file.originalname || "logo.png",
        file.mimetype || "image/png",
        callerSession
      );

      return sendSuccess(
        res,
        {
          logoUrl: result.logoUrl,
          storageKey: result.storageKey,
          message: "Company logo uploaded and verified successfully.",
        },
        201
      );
    } catch (error: any) {
      logger.error("[Company] uploadLogo error:", error);
      const statusCode = error.message.includes("Forbidden")
        ? 403
        : error.message.includes("Invalid") || error.message.includes("too large")
        ? 400
        : 500;
      return sendError(res, error.message || "Failed to upload logo", statusCode);
    }
  }

  async getLogo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const file = await companyService.getLogoFile(id);
      if (!file) {
        return sendError(res, "Company logo not found", 404);
      }

      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day cache
      return res.send(file.buffer);
    } catch (error: any) {
      logger.error("[Company] getLogo error:", error);
      return sendError(res, "Failed to fetch logo", 500);
    }
  }

  async deleteLogo(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const callerSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const result = await companyService.deleteLogo(id, callerSession);
      return sendSuccess(res, { ...result, message: "Company logo deleted successfully." });
    } catch (error: any) {
      logger.error("[Company] deleteLogo error:", error);
      const statusCode = error.message.includes("Forbidden")
        ? 403
        : error.message.includes("not found")
        ? 404
        : 500;
      return sendError(res, error.message || "Failed to delete company logo", statusCode);
    }
  }

  async getRatings(req: Request, res: Response) {
    try {
      const companyId = (req.query.companyId || req.query.companyName) as string;
      const ratings = await companyService.getRatings(companyId);
      return sendSuccess(res, { count: ratings.length, ratings });
    } catch (error: any) {
      logger.error("[Company] getRatings error:", error);
      return sendError(res, error.message || "Failed to fetch ratings", 500);
    }
  }

  async postRating(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId, companyName, rating, reviewTitle, reviewText } = req.body;
      const targetCompany = companyId || companyName;
      if (!targetCompany || !rating) {
        return sendError(res, "companyId (or companyName) and rating (1-5) are required", 400);
      }

      const userSession = {
        userId: req.user?.userId || req.body.userId || "usr-anon",
        name: req.user?.name || req.body.userName || "Verified Candidate",
        role: req.user?.role || req.body.userRole || "Candidate",
        email: req.user?.email || req.body.email,
      };

      const result = await companyService.submitRating(req.body, userSession);
      return sendSuccess(
        res,
        {
          rating: result.rating,
          company: result.company,
          message: "Review submitted successfully.",
        },
        201
      );
    } catch (error: any) {
      logger.error("[Company] postRating error:", error);
      const statusCode = error.message.includes("Duplicate review") ? 409 : 400;
      return sendError(res, error.message || "Failed to submit review", statusCode);
    }
  }

  async deleteRating(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const callerSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const deleted = await companyService.deleteRating(id, callerSession);
      if (!deleted) {
        return sendError(res, `Review with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { deleted: true, message: "Review deleted successfully." });
    } catch (error: any) {
      logger.error("[Company] deleteRating error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to delete review", statusCode);
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
      const status = req.body.status || (req.body.verified !== undefined ? (req.body.verified ? "verified" : "rejected") : "verified");
      const notes = req.body.notes || req.body.verificationNotes;

      const adminSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const updated = await companyService.updateVerificationStatus(id, status, notes, adminSession);

      return sendSuccess(res, {
        company: updated,
        message: `Company "${updated.name}" verification updated to "${updated.verificationStatus}".`,
      });
    } catch (error: any) {
      logger.error("[Company] verifyCompany error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to verify company", statusCode);
    }
  }
}

export const companyController = new CompanyController();
