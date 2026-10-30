import { query } from "../db/postgresClient.js";
import { AuditLogRecord } from "../models/types.js";
import { logger } from "../utils/logger.js";
import crypto from "crypto";

export class AuditLogRepository {
  async create(record: Omit<AuditLogRecord, "id"> & { id?: string }): Promise<AuditLogRecord> {
    const id = record.id || `audit-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const res = await query(
      `INSERT INTO moas.audit_logs (
        id, actor_id, actor_email, actor_role, action,
        resource_type, resource_id, details, ip_address, outcome
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, actor_id as "actorId", actor_email as "actorEmail", actor_role as "actorRole",
                action, resource_type as "resourceType", resource_id as "resourceId",
                details, ip_address as "ipAddress", outcome, created_at as "createdAt";`,
      [
        id,
        record.actorId || null,
        record.actorEmail || null,
        record.actorRole || null,
        record.action,
        record.resourceType,
        record.resourceId || null,
        JSON.stringify(record.details || {}),
        record.ipAddress || null,
        record.outcome || "SUCCESS",
      ]
    );

    return res.rows[0];
  }

  async getRecent(
    limit = 100,
    filters?: { action?: string; actorId?: string; resourceType?: string }
  ): Promise<AuditLogRecord[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters?.action) {
      conditions.push(`action = $${idx++}`);
      values.push(filters.action);
    }
    if (filters?.actorId) {
      conditions.push(`actor_id = $${idx++}`);
      values.push(filters.actorId);
    }
    if (filters?.resourceType) {
      conditions.push(`resource_type = $${idx++}`);
      values.push(filters.resourceType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(limit);

    const res = await query(
      `SELECT id, actor_id as "actorId", actor_email as "actorEmail", actor_role as "actorRole",
              action, resource_type as "resourceType", resource_id as "resourceId",
              details, ip_address as "ipAddress", outcome, created_at as "createdAt"
       FROM moas.audit_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${idx};`,
      values
    );

    return res.rows;
  }
}

export const auditLogRepository = new AuditLogRepository();
