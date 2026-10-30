import { Router } from "express";
import v1Router from "./v1/index.js";
import legacyRouter from "./legacy.routes.js";
import { getAIClient } from "../integrations/gemini.js";
import { config } from "../config/index.js";

const rootApiRouter = Router();

// Health check endpoint
rootApiRouter.get("/health", (req, res) => {
  const ai = getAIClient();
  res.json({
    status: "ok",
    service: "MOAS Platform API",
    version: "v1",
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
