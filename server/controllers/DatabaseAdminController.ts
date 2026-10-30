import { Request, Response } from "express";
import { databaseAdminService } from "../services/DatabaseAdminService.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class DatabaseAdminController {
  async getStatus(req: Request, res: Response) {
    try {
      const status = await databaseAdminService.getStatus();
      return sendSuccess(res, status);
    } catch (error: any) {
      logger.error("[DatabaseAdmin] getStatus error:", error);
      return sendError(res, error.message || "Failed to fetch database status", 500);
    }
  }

  async getPostgresStatus(req: Request, res: Response) {
    try {
      const pgStatus = await databaseAdminService.getPostgresStatus();
      return sendSuccess(res, pgStatus);
    } catch (error: any) {
      logger.error("[DatabaseAdmin] getPostgresStatus error:", error);
      return sendError(res, error.message || "Failed to fetch PostgreSQL status", 500);
    }
  }

  async getTableRows(req: Request, res: Response) {
    try {
      const { table } = req.params;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const data = await databaseAdminService.getTableRows(table, limit);
      return sendSuccess(res, data);
    } catch (error: any) {
      logger.error("[DatabaseAdmin] getTableRows error:", error);
      const statusCode = error.message.includes("Invalid table") ? 400 : 500;
      return sendError(res, error.message || "Failed to inspect table", statusCode);
    }
  }

  async seedData(req: Request, res: Response) {
    try {
      const result = await databaseAdminService.seedData(true);
      return sendSuccess(res, { message: "Database re-seeded successfully", ...result });
    } catch (error: any) {
      logger.error("[DatabaseAdmin] seedData error:", error);
      return sendError(res, error.message || "Failed to seed database", 500);
    }
  }
}

export const databaseAdminController = new DatabaseAdminController();
