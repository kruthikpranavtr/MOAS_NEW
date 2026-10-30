import { Response } from "express";
import { resumeService } from "../services/ResumeService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class ResumeController {
  /**
   * List all resumes for the authenticated user (or specified user if admin).
   */
  async listResumes(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to access resumes.", 401);
      }

      const targetUserId = (req.query.userId as string) || req.user.userId;
      const caller = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const resumes = await resumeService.getResumesForUser(targetUserId, caller);
      return sendSuccess(res, { resumes });
    } catch (error: any) {
      logger.error("[Resume] listResumes error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to list resumes", statusCode);
    }
  }

  /**
   * Get metadata for a single resume by ID.
   */
  async getResumeById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to access resumes.", 401);
      }

      const { id } = req.params;
      const caller = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const resume = await resumeService.getResumeById(id, caller);
      if (!resume) {
        return sendError(res, `Resume with ID "${id}" not found`, 404);
      }

      return sendSuccess(res, { resume });
    } catch (error: any) {
      logger.error("[Resume] getResumeById error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 500;
      return sendError(res, error.message || "Failed to fetch resume", statusCode);
    }
  }

  /**
   * Upload a resume file (multipart/form-data with multer).
   */
  async uploadResumeFile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to upload resume.", 401);
      }

      const file = (req as any).file;
      const targetUserId = req.body.userId || req.user.userId;
      const isPrimary = req.body.isPrimary === "true" || req.body.isPrimary === true;

      if (!file || !file.buffer) {
        // Fallback: check if JSON dataUrl was sent in body
        if (req.body.resume && req.body.resume.dataUrl) {
          return await this.uploadResume(req, res);
        }
        return sendError(res, "No resume file provided for upload.", 400);
      }

      const callerSession = {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
      };

      const result = await resumeService.uploadResumeFile({
        targetUserId,
        originalFilename: file.originalname,
        buffer: file.buffer,
        isPrimary,
        callerSession,
      });

      return sendSuccess(
        res,
        {
          resume: result.resume,
          completeness: result.completeness,
          message: "Resume successfully validated, uploaded, and permanently saved in PostgreSQL.",
        },
        201
      );
    } catch (error: any) {
      logger.error("[Resume] uploadResumeFile error:", error);
      const msg = error.message || "";
      const lower = msg.toLowerCase();
      const statusCode = lower.includes("access denied") || lower.includes("forbidden")
        ? 403
        : lower.includes("limit") || lower.includes("invalid") || lower.includes("magic") || lower.includes("format") || lower.includes("does not match") || lower.includes("empty")
        ? 400
        : 500;
      return sendError(res, msg || "Failed to upload resume", statusCode);
    }
  }

  /**
   * Securely stream and download a resume document.
   */
  async downloadResume(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to download resume.", 401);
      }

      const { id } = req.params;
      const caller = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const download = await resumeService.downloadResume(id, caller);

      res.setHeader("Content-Type", download.mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(download.filename)}"`
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
      res.setHeader("Content-Length", download.buffer.length);

      return res.send(download.buffer);
    } catch (error: any) {
      logger.error("[Resume] downloadResume error:", error);
      const msg = error.message || "";
      const statusCode = msg.includes("Forbidden")
        ? 403
        : msg.includes("not found")
        ? 404
        : 500;
      return sendError(res, msg || "Failed to download resume", statusCode);
    }
  }

  /**
   * Set a candidate's primary active resume.
   */
  async setPrimary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const caller = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const updated = await resumeService.setPrimaryResume(id, caller);
      return sendSuccess(res, {
        resume: updated,
        message: "Primary resume updated successfully.",
      });
    } catch (error: any) {
      logger.error("[Resume] setPrimary error:", error);
      const msg = error.message || "";
      const statusCode = msg.includes("Forbidden")
        ? 403
        : msg.includes("not found")
        ? 404
        : 500;
      return sendError(res, msg || "Failed to set primary resume", statusCode);
    }
  }

  /**
   * Delete a resume document and its stored file.
   */
  async deleteResume(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required.", 401);
      }

      const { id } = req.params;
      const caller = {
        userId: req.user.userId,
        role: req.user.role,
      };

      const result = await resumeService.deleteResume(id, caller);
      return sendSuccess(res, {
        success: result.success,
        newPrimaryId: result.newPrimaryId,
        message: "Resume document permanently removed from storage.",
      });
    } catch (error: any) {
      logger.error("[Resume] deleteResume error:", error);
      const msg = error.message || "";
      const statusCode = msg.includes("Forbidden")
        ? 403
        : msg.includes("not found")
        ? 404
        : 500;
      return sendError(res, msg || "Failed to delete resume", statusCode);
    }
  }

  /**
   * Analyze an uploaded resume using text extraction and algorithmic matching.
   */
  async analyzeResume(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { role, skills, experienceYears, targetJobRequirements } = req.body;

      const callerSession = req.user
        ? {
            userId: req.user.userId,
            role: req.user.role,
          }
        : undefined;

      const analysis = await resumeService.analyzeResume({
        resumeId: id,
        role,
        skills,
        experienceYears,
        targetJobRequirements,
        callerSession,
      });

      return sendSuccess(res, analysis);
    } catch (error: any) {
      logger.error("[Resume] analyzeResume error:", error);
      const msg = error.message || "";
      const statusCode = msg.includes("Forbidden") ? 403 : 500;
      return sendError(res, msg || "Failed to analyze resume", statusCode);
    }
  }

  /**
   * Legacy uploadResume handler for JSON body compatibility.
   */
  async uploadResume(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to upload resume.", 401);
      }

      const { email, userId, resume } = req.body;
      if (!resume || !resume.name) {
        return sendError(res, "Resume object with name is required", 400);
      }

      const callerSession = {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
      };

      const result = await resumeService.uploadResume(userId, email, resume, callerSession);
      return sendSuccess(res, {
        resumes: result.resumes,
        user: result.user,
        message: "Resume successfully saved and synchronized.",
      });
    } catch (error: any) {
      logger.error("[Resume] uploadResume error:", error);
      const msg = error.message || "";
      const statusCode = msg.includes("Access denied")
        ? 403
        : msg.includes("limit") || msg.includes("Invalid")
        ? 400
        : 500;
      return sendError(res, msg || "Failed to upload resume", statusCode);
    }
  }
}

export const resumeController = new ResumeController();
