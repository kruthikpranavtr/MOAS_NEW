import express, { Express } from "express";
import cookieParser from "cookie-parser";
import { securityHeadersMiddleware } from "./middleware/security.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { requestLoggerMiddleware } from "./middleware/requestLogger.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { verifyCsrf } from "./middleware/auth.js";
import rootApiRouter from "./routes/index.js";

export function createApp(): Express {
  const app = express();

  // 1. Security Headers (Helmet + CSP)
  app.use(securityHeadersMiddleware);

  // 2. Cookie parsing for secure HttpOnly session tokens
  app.use(cookieParser());

  // 3. Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // 4. Request IDs & structured logging
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  // 5. Double-submit CSRF Protection for state-changing cookie requests
  app.use(verifyCsrf);

  // 6. Mount API routes at /api
  app.use("/api", rootApiRouter);

  // 6. Catch-all 404 for unhandled API routes
  app.all("/api/*", notFoundHandler);

  // 7. Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
