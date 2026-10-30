import { Request, Response } from "express";
import { jobService } from "../services/JobService.js";
import { companyMemberRepository } from "../repositories/CompanyMemberRepository.js";
import { companyRepository } from "../repositories/CompanyRepository.js";
import { userRepository } from "../repositories/UserRepository.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { auditLogger } from "../utils/auditLogger.js";
import { logger } from "../utils/logger.js";

export class JobController {
  async getAllJobs(req: Request, res: Response) {
    try {
      const filters = {
        category: req.query.category as string,
        location: req.query.location as string,
        search: req.query.search as string,
        employerId: req.query.employerId as string,
      };
      const jobs = await jobService.getAllJobs(filters);
      return sendSuccess(res, { count: jobs.length, jobs });
    } catch (error: any) {
      logger.error("[Job] getAllJobs error:", error);
      return sendError(res, error.message || "Failed to fetch jobs", 500);
    }
  }

  async getJobById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const job = await jobService.getJobById(id);
      if (!job) {
        return sendError(res, `Job with ID "${id}" not found`, 404);
      }
      return sendSuccess(res, { job });
    } catch (error: any) {
      logger.error("[Job] getJobById error:", error);
      return sendError(res, error.message || "Failed to fetch job", 500);
    }
  }

  async createJob(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to post jobs.", 401);
      }

      const callerId = req.user.userId;
      const callerRole = (req.user.role || "").toLowerCase();

      // Candidates strictly forbidden from posting jobs
      if (callerRole === "candidate" || callerRole === "jobseeker") {
        return sendError(res, "Forbidden: Action restricted to Employer or Admin accounts.", 403);
      }

      let targetCompanyId = req.body.companyId;
      let targetCompanyName = req.body.company;

      if (callerRole === "employer") {
        const userMemberships = await companyMemberRepository.getUserCompanies(callerId);

        if (targetCompanyId) {
          const isMember = userMemberships.some((m) => m.companyId === targetCompanyId && m.isVerified);
          if (!isMember) {
            return sendError(res, "Forbidden: You are not authorized to post jobs on behalf of this company.", 403);
          }
          const comp = await companyRepository.getById(targetCompanyId);
          if (comp) targetCompanyName = comp.name;
        } else if (targetCompanyName) {
          const existingComp = await companyRepository.getByName(targetCompanyName);
          if (existingComp) {
            const isMember = userMemberships.some((m) => m.companyId === existingComp.id && m.isVerified);
            if (!isMember && userMemberships.length > 0) {
              return sendError(res, "Forbidden: You are not authorized to post jobs on behalf of this company.", 403);
            }
            if (!isMember && userMemberships.length === 0) {
              await companyMemberRepository.addMember({
                companyId: existingComp.id,
                userId: callerId,
                role: "owner",
                isVerified: true,
              });
            }
            targetCompanyId = existingComp.id;
          } else {
            // New company creation for employer
            const newComp = await companyRepository.create({
              name: targetCompanyName,
              ownerUserId: callerId,
              verified: false, // Self-approved verification blocked
            });
            targetCompanyId = newComp.id;
            await companyMemberRepository.addMember({
              companyId: newComp.id,
              userId: callerId,
              role: "owner",
              isVerified: true,
            });
          }
        } else {
          // Default to employer's first verified company
          if (userMemberships.length > 0) {
            targetCompanyId = userMemberships[0].companyId;
            const comp = await companyRepository.getById(targetCompanyId);
            if (comp) targetCompanyName = comp.name;
          } else {
            const user = await userRepository.getByIdOrEmail(callerId);
            if (user?.companyName) {
              const comp = await companyRepository.getByName(user.companyName) || await companyRepository.create({
                name: user.companyName,
                ownerUserId: callerId,
                verified: false,
              });
              targetCompanyId = comp.id;
              targetCompanyName = comp.name;
              await companyMemberRepository.addMember({
                companyId: comp.id,
                userId: callerId,
                role: "owner",
                isVerified: true,
              });
            }
          }
        }
      }

      const jobData = {
        ...req.body,
        company: targetCompanyName || req.body.company,
        companyId: targetCompanyId,
        employerId: callerId, // Verified from server session
      };

      const created = await jobService.createJob(jobData);

      await auditLogger.log({
        req,
        action: "JOB_POSTED",
        resourceType: "job",
        resourceId: created.id,
        details: { title: created.title, company: created.company, companyId: created.companyId },
        outcome: "SUCCESS",
      });

      return sendSuccess(res, { job: created, message: "Job posted successfully." }, 201);
    } catch (error: any) {
      logger.error("[Job] createJob error:", error);
      const statusCode = error.message.includes("Forbidden") ? 403 : 400;
      return sendError(res, error.message || "Failed to create job", statusCode);
    }
  }

  async updateJob(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to update job.", 401);
      }

      const { id } = req.params;
      const callerId = req.user.userId;
      const callerRole = (req.user.role || "").toLowerCase();

      if (callerRole === "candidate" || callerRole === "jobseeker") {
        return sendError(res, "Forbidden: Action restricted to Employer or Admin accounts.", 403);
      }

      const existing = await jobService.getJobById(id);
      if (!existing) {
        return sendError(res, `Job with ID "${id}" not found`, 404);
      }

      if (callerRole === "employer") {
        const isOwner = existing.employerId === callerId;
        const isCompanyMember = existing.companyId
          ? await companyMemberRepository.isUserInCompany(callerId, existing.companyId)
          : false;

        if (!isOwner && !isCompanyMember) {
          return sendError(res, "Forbidden: You are not authorized to modify job listings for another company.", 403);
        }
      }

      // Mass assignment protection: prevent changing immutable fields
      const { id: _ignoredId, employerId: _ignoredEmployerId, ...allowedUpdates } = req.body;

      const updated = await jobService.updateJob(id, allowedUpdates);

      await auditLogger.log({
        req,
        action: "JOB_UPDATED",
        resourceType: "job",
        resourceId: id,
        details: { title: updated?.title },
        outcome: "SUCCESS",
      });

      return sendSuccess(res, { job: updated, message: "Job updated successfully." });
    } catch (error: any) {
      logger.error("[Job] updateJob error:", error);
      return sendError(res, error.message || "Failed to update job", 500);
    }
  }

  async deleteJob(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, "Authentication required to delete job.", 401);
      }

      const { id } = req.params;
      const callerId = req.user.userId;
      const callerRole = (req.user.role || "").toLowerCase();

      if (callerRole === "candidate" || callerRole === "jobseeker") {
        return sendError(res, "Forbidden: Action restricted to Employer or Admin accounts.", 403);
      }

      const existing = await jobService.getJobById(id);
      if (!existing) {
        return sendError(res, `Job with ID "${id}" not found`, 404);
      }

      if (callerRole === "employer") {
        const isOwner = existing.employerId === callerId;
        const isCompanyMember = existing.companyId
          ? await companyMemberRepository.isUserInCompany(callerId, existing.companyId)
          : false;

        if (!isOwner && !isCompanyMember) {
          return sendError(res, "Forbidden: You are not authorized to delete job listings for another company.", 403);
        }
      }

      const deleted = await jobService.deleteJob(id);

      await auditLogger.log({
        req,
        action: "JOB_DELETED",
        resourceType: "job",
        resourceId: id,
        details: { title: existing.title, company: existing.company },
        outcome: "SUCCESS",
      });

      return sendSuccess(res, { deleted, message: "Job deleted successfully." });
    } catch (error: any) {
      logger.error("[Job] deleteJob error:", error);
      return sendError(res, error.message || "Failed to delete job", 500);
    }
  }
}

export const jobController = new JobController();
