import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  errors?: string[];
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const requestId = req.id || "no-id";
  const errorCode = err.code || (statusCode === 500 ? "INTERNAL_SERVER_ERROR" : "ERROR");

  logger.error(`Unhandled error processing ${req.method} ${req.originalUrl} [${requestId}]:`, err);

  res.status(statusCode).json({
    success: false,
    code: errorCode,
    error: err.message || "An unexpected internal server error occurred.",
    requestId,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}
