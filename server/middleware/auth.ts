import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { UserSession } from "../models/types.js";
import { config } from "../config/index.js";
import { sessionRepository } from "../repositories/SessionRepository.js";
import { logger } from "../utils/logger.js";

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
  authMethod?: "cookie" | "bearer" | "header";
}

/**
 * Creates a persistent session in PostgreSQL and returns a cryptographically secure token
 */
export async function createSessionRecord(
  user: {
    id: string;
    username?: string;
    email: string;
    role: string;
    name: string;
  },
  rememberMe = false,
  metadata?: { userAgent?: string; ipAddress?: string }
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : config.auth.sessionTtlMs;
  const expiresAt = new Date(Date.now() + ttlMs);

  await sessionRepository.create({
    userId: user.id,
    token,
    expiresAt,
    userAgent: metadata?.userAgent,
    ipAddress: metadata?.ipAddress,
  });

  return token;
}

/**
 * Retrieves a session from PostgreSQL by token
 */
export async function getSessionRecord(token: string): Promise<UserSession | null> {
  if (!token) return null;
  const sessionWithUser = await sessionRepository.getByToken(token);
  if (!sessionWithUser) return null;

  return {
    token,
    userId: sessionWithUser.user.id,
    username: sessionWithUser.user.username,
    email: sessionWithUser.user.email,
    role: sessionWithUser.user.role,
    name: sessionWithUser.user.name,
    createdAt: new Date(sessionWithUser.session.createdAt).getTime(),
    expiresAt: new Date(sessionWithUser.session.expiresAt).getTime(),
  };
}

/**
 * Deletes a session from PostgreSQL (logout)
 */
export async function deleteSessionRecord(token: string): Promise<boolean> {
  if (!token) return false;
  return await sessionRepository.delete(token);
}

/**
 * Purges all sessions for a user (used after password reset)
 */
export async function clearAllUserSessions(userId: string): Promise<number> {
  return await sessionRepository.deleteAllForUser(userId);
}

export const createSession = createSessionRecord;
export const getSession = getSessionRecord;
export const deleteSession = deleteSessionRecord;

/**
 * Extracts session token and detects authentication method
 */
export function extractToken(req: AuthenticatedRequest): { token: string | null; method: "cookie" | "bearer" | "header" | null } {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const t = authHeader.substring(7).trim();
    if (t) return { token: t, method: "bearer" };
  }

  // 2. HttpOnly Cookie: moas_session_token
  const cookieToken = req.cookies?.[config.auth.cookieName];
  if (typeof cookieToken === "string" && cookieToken.trim()) {
    return { token: cookieToken.trim(), method: "cookie" };
  }

  // 3. Custom Header fallback: x-session-token
  const customHeader = req.headers["x-session-token"] || req.headers["x-auth-token"];
  if (typeof customHeader === "string" && customHeader.trim()) {
    return { token: customHeader.trim(), method: "header" };
  }

  return { token: null, method: null };
}

/**
 * Sets secure HttpOnly session cookie and readable CSRF token cookie
 */
export function setSessionCookie(res: Response, token: string, rememberMe = false) {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : config.auth.sessionTtlMs;

  res.cookie(config.auth.cookieName, token, {
    httpOnly: true,
    secure: config.app.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  // Double-submit CSRF cookie (readable by frontend scripts)
  const csrfToken = crypto.randomBytes(16).toString("hex");
  res.cookie("moas_csrf_token", csrfToken, {
    httpOnly: false,
    secure: config.app.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

/**
 * Clears session and CSRF cookies on logout
 */
export function clearSessionCookie(res: Response) {
  res.clearCookie(config.auth.cookieName, {
    path: "/",
    httpOnly: true,
  });
  res.clearCookie("moas_csrf_token", {
    path: "/",
    httpOnly: false,
  });
}

/**
 * Express middleware requiring a valid authenticated session from PostgreSQL
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { token, method } = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        error: "Authentication required. Please log in with valid credentials.",
      });
    }

    const sessionWithUser = await sessionRepository.getByToken(token);
    if (!sessionWithUser) {
      return res.status(401).json({
        success: false,
        code: "SESSION_EXPIRED",
        error: "Invalid or expired session token. Please log in again.",
      });
    }

    req.user = {
      token,
      userId: sessionWithUser.user.id,
      username: sessionWithUser.user.username,
      email: sessionWithUser.user.email,
      role: sessionWithUser.user.role,
      name: sessionWithUser.user.name,
      createdAt: new Date(sessionWithUser.session.createdAt).getTime(),
      expiresAt: new Date(sessionWithUser.session.expiresAt).getTime(),
    };
    req.authMethod = method || undefined;

    next();
  } catch (error: any) {
    logger.error("[requireAuth] Error validating session:", error?.message);
    return res.status(500).json({ success: false, error: "Failed to authenticate session." });
  }
}

/**
 * Optional authentication middleware: enriches req.user if a valid token is provided
 */
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { token, method } = extractToken(req);
    if (token) {
      const sessionWithUser = await sessionRepository.getByToken(token);
      if (sessionWithUser) {
        req.user = {
          token,
          userId: sessionWithUser.user.id,
          username: sessionWithUser.user.username,
          email: sessionWithUser.user.email,
          role: sessionWithUser.user.role,
          name: sessionWithUser.user.name,
          createdAt: new Date(sessionWithUser.session.createdAt).getTime(),
          expiresAt: new Date(sessionWithUser.session.expiresAt).getTime(),
        };
        req.authMethod = method || undefined;
      }
    }
  } catch (err: any) {
    // Non-blocking optional authentication
  }
  next();
}

/**
 * Role-Based Access Control middleware
 */
export function requireRole(allowedRoles: string[]) {
  const normalized = allowedRoles.map((r) => r.toLowerCase());
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        error: "Authentication required.",
      });
    }

    const userRole = (req.user.role || "").toLowerCase();
    if (!normalized.includes(userRole) && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        error: `Access denied. Action restricted to ${allowedRoles.join(" or ")} accounts.`,
      });
    }

    next();
  };
}

/**
 * CSRF Protection Middleware: Protects cookie-authenticated state-changing requests
 */
export function verifyCsrf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Only state-changing HTTP methods need CSRF validation
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (!stateChangingMethods.includes(req.method.toUpperCase())) {
    return next();
  }

  // If request uses Bearer token, it is inherently safe against browser cross-site ambient credentials
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return next();
  }

  // If request has cookie authentication, verify Origin / Referer or double-submit CSRF token
  const cookieToken = req.cookies?.[config.auth.cookieName];
  if (cookieToken) {
    const origin = req.headers.origin || "";
    const referer = req.headers.referer || "";
    const host = req.headers.host || "";
    const secFetchSite = req.headers["sec-fetch-site"];

    // Modern browsers send Sec-Fetch-Site: 'same-origin', 'same-site', 'cross-site', or 'none'
    if (secFetchSite === "cross-site") {
      const csrfHeader = req.headers["x-csrf-token"];
      const csrfCookie = req.cookies?.["moas_csrf_token"];
      if (!csrfHeader || csrfHeader !== csrfCookie) {
        return res.status(403).json({
          success: false,
          code: "CSRF_VALIDATION_FAILED",
          error: "Cross-site request forgery protection rejected this request. Please refresh the page.",
        });
      }
    }

    // If Origin or Referer is present, verify it matches host or local environment
    if (origin || referer) {
      const isLocal =
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        referer.includes("localhost") ||
        referer.includes("127.0.0.1");
      const isMatchingHost = (origin && origin.includes(host)) || (referer && referer.includes(host));

      const csrfHeader = req.headers["x-csrf-token"];
      const csrfCookie = req.cookies?.["moas_csrf_token"];
      const isCsrfTokenValid = csrfHeader && csrfCookie && csrfHeader === csrfCookie;

      if (!isLocal && !isMatchingHost && !isCsrfTokenValid) {
        logger.warn("[CSRF] Blocked cross-origin state-changing request:", {
          method: req.method,
          path: req.path,
          origin,
          referer,
          host,
        });
        return res.status(403).json({
          success: false,
          code: "CSRF_VALIDATION_FAILED",
          error: "Cross-site request forgery protection rejected this request. Please refresh the page.",
        });
      }
    }
  }

  next();
}
