import { Router } from "express";
import v1Router from "./v1/index.js";
import legacyRouter from "./legacy.routes.js";
import { getAIClient } from "../integrations/gemini.js";
import { config } from "../config/index.js";

import { checkDbHealth } from "../db/postgresClient.js";

const rootApiRouter = Router();

// Health check endpoint
rootApiRouter.get("/health", async (req, res) => {
  const ai = getAIClient();
  const dbHealth = await checkDbHealth();
  const isHealthy = dbHealth.status === "connected";
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    service: "MOAS Platform API",
    version: "v1",
    database: {
      status: dbHealth.status,
      engine: "PostgreSQL 16",
      database: dbHealth.database,
      latencyMs: dbHealth.latencyMs,
      pool: dbHealth.pool,
      error: dbHealth.error,
    },
    geminiConfigured: !!ai,
    environment: config.app.env,
    timestamp: new Date().toISOString(),
  });
});

// Versioned API v1
rootApiRouter.use("/v1", v1Router);

// Legacy backward-compatibility routes directly under /api/*
rootApiRouter.use("/", legacyRouter);

export default rootApiRouter;
