import { auditLogRepository } from "../repositories/AuditLogRepository.js";
import { logger } from "./logger.js";
import { Request } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";

export interface LogAuditParams {
  req?: Request | AuthenticatedRequest;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  outcome?: "SUCCESS" | "DENIED" | "FAILURE";
}

export class AuditLogger {
  async log(params: LogAuditParams): Promise<void> {
    try {
      const authReq = params.req as AuthenticatedRequest | undefined;
      const actorId = params.actorId || authReq?.user?.userId;
      const actorEmail = params.actorEmail || authReq?.user?.email;
      const actorRole = params.actorRole || authReq?.user?.role;
      const ipAddress = (params.req?.headers["x-forwarded-for"] as string) || params.req?.ip || undefined;

      // Filter out any sensitive information like passwords, tokens, hashes from details
      const cleanDetails: Record<string, any> = {};
      if (params.details) {
        for (const [k, v] of Object.entries(params.details)) {
          if (!/password|token|hash|secret|otp/i.test(k)) {
            cleanDetails[k] = v;
          }
        }
      }

      await auditLogRepository.create({
        actorId,
        actorEmail,
        actorRole,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        details: cleanDetails,
        ipAddress,
        outcome: params.outcome || "SUCCESS",
      });

      logger.info(`[AUDIT] ${params.action} on ${params.resourceType} (${params.resourceId || "N/A"}) by ${actorEmail || actorId || "anonymous"} [${params.outcome || "SUCCESS"}]`);
    } catch (err: any) {
      logger.error("[AUDIT] Failed to record audit log:", err?.message);
    }
  }
}

export const auditLogger = new AuditLogger();
