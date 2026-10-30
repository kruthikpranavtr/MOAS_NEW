import rateLimit from "express-rate-limit";
import { config } from "../config/index.js";

export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.app.isTest ? 1000 : config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "TOO_MANY_REQUESTS",
    error: "Too many authentication attempts. Please try again after 15 minutes.",
  },
  skip: () => config.app.isTest,
});

export const otpRateLimiter = rateLimit({
  windowMs: config.rateLimit.otpWindowMs,
  max: config.app.isTest ? 1000 : config.rateLimit.otpMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "TOO_MANY_REQUESTS",
    error: "Too many verification code requests. Please wait 10 minutes before trying again.",
  },
  skip: () => config.app.isTest,
});

export const generalApiLimiter = rateLimit({
  windowMs: config.rateLimit.generalWindowMs,
  max: config.app.isTest ? 5000 : config.rateLimit.generalMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "TOO_MANY_REQUESTS",
    error: "Too many requests. Please slow down.",
  },
  skip: () => config.app.isTest,
});
