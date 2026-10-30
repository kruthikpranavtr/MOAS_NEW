import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  // Avoid verbose request logging during automated test suite execution
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  const startTime = Date.now();
  const requestId = req.id || "no-id";

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const message = `${req.method} ${req.originalUrl} - ${statusCode} (${durationMs}ms) [${requestId}]`;

    if (statusCode >= 500) {
      logger.error(message);
    } else if (statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  });

  next();
}
