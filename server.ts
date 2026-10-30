import path from "path";
import http from "http";
import express from "express";
import { createApp } from "./server/app.js";
import { config } from "./server/config/index.js";
import { logger } from "./server/utils/logger.js";
import { ResumeItem, UserRecord } from "./server/models/types.js";

// Re-export type aliases for legacy compatibility
export type ServerResumeItem = ResumeItem;
export type ServerUserRecord = UserRecord;

const app = createApp();
const PORT = config.app.port;

let server: http.Server | null = null;

// Setup Vite middleware in dev or static files in prod
export async function setupVite() {
  if (!config.app.isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`MOAS Server running on http://0.0.0.0:${PORT} [${config.app.env}]`);
  });

  return server;
}

// Graceful server shutdown on termination signals
function handleShutdown(signal: string) {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);
  if (server) {
    server.close(() => {
      logger.info("HTTP server closed. Exiting process.");
      process.exit(0);
    });

    // Force exit if active connections do not drain in time
    setTimeout(() => {
      logger.error("Forcefully terminating active connections after timeout.");
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

export { app };

if (process.env.NODE_ENV !== "test") {
  setupVite().catch((err) => {
    logger.error("Failed to start MOAS server:", err);
  });
}
