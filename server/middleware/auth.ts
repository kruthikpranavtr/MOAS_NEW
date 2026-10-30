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

import { companyMemberRepository } from "../repositories/CompanyMemberRepository.js";

/**
 * Canonical platform permission types
 */
export type Permission =
  | "jobs:read"
  | "jobs:create"
  | "jobs:update"
  | "jobs:delete"
  | "applications:apply"
  | "applications:view_own"
  | "applications:view_company"
  | "applications:update_status"
  | "applications:delete"
  | "resumes:manage_own"
  | "resumes:view_applicant"
  | "saved_jobs:manage"
  | "job_alerts:manage"
  | "company:manage"
  | "company:verify"
  | "admin:manage_users"
  | "admin:audit_logs"
  | "admin:database";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    "jobs:read",
    "jobs:create",
    "jobs:update",
    "jobs:delete",
    "applications:apply",
    "applications:view_own",
    "applications:view_company",
    "applications:update_status",
    "applications:delete",
    "resumes:manage_own",
    "resumes:view_applicant",
    "saved_jobs:manage",
    "job_alerts:manage",
    "company:manage",
    "company:verify",
    "admin:manage_users",
    "admin:audit_logs",
    "admin:database",
  ],
  employer: [
    "jobs:read",
    "jobs:create",
    "jobs:update",
    "jobs:delete",
    "applications:view_company",
    "applications:update_status",
    "resumes:view_applicant",
    "company:manage",
  ],
  candidate: [
    "jobs:read",
    "applications:apply",
    "applications:view_own",
    "applications:delete",
    "resumes:manage_own",
    "saved_jobs:manage",
    "job_alerts:manage",
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const normRole = (role || "").toLowerCase();
  if (normRole === "admin") return true;
  const permissions = ROLE_PERMISSIONS[normRole] || [];
  return permissions.includes(permission);
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
 * Admin-only authorization shortcut
 */
export const requireAdmin = requireRole(["Admin"]);

/**
 * Resource ownership authorization middleware
 */
export function requireResourceOwner(paramName = "id", idExtractor?: (req: AuthenticatedRequest) => string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        error: "Authentication required.",
      });
    }

    const targetId = idExtractor ? idExtractor(req) : req.params[paramName];
    const callerId = req.user.userId;
    const callerRole = (req.user.role || "").toLowerCase();

    if (callerId !== targetId && callerRole !== "admin") {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        error: "Access denied. You can only manage your own personal resources.",
      });
    }

    next();
  };
}

/**
 * Company membership authorization middleware
 */
export function requireCompanyMembership(companyIdExtractor?: (req: AuthenticatedRequest) => string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        error: "Authentication required.",
      });
    }

    const callerRole = (req.user.role || "").toLowerCase();
    if (callerRole === "admin") {
      return next();
    }

    const companyId = companyIdExtractor
      ? companyIdExtractor(req)
      : req.params.companyId || req.body.companyId || req.query.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        code: "MISSING_COMPANY_ID",
        error: "Company ID is required to verify authorization.",
      });
    }

    const isMember = await companyMemberRepository.isUserInCompany(req.user.userId, String(companyId));
    if (!isMember) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        error: "Access denied. You are not an authorized member of this company.",
      });
    }

    next();
  };
}

/**
 * Granular capability authorization middleware
 */
export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        error: "Authentication required.",
      });
    }

    const role = req.user.role || "";
    if (!hasPermission(role, permission)) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        error: `Access denied. Insufficient permissions for ${permission}.`,
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
    const isLogout = req.path.endsWith("/logout");
    if (isLogout) {
      return next();
    }

    const origin = req.headers.origin || "";
    const referer = req.headers.referer || "";
    const host = req.headers.host || "";
    const secFetchSite = req.headers["sec-fetch-site"];

    const csrfHeader = req.headers["x-csrf-token"];
    const csrfCookie = req.cookies?.["moas_csrf_token"];
    const isCsrfTokenValid = Boolean(csrfHeader && csrfCookie && csrfHeader === csrfCookie);

    // If double-submit CSRF token matches, request is authorized
    if (isCsrfTokenValid) {
      return next();
    }

    // Modern browsers send Sec-Fetch-Site: 'same-origin', 'same-site', 'cross-site', or 'none'
    if (secFetchSite === "cross-site") {
      logger.warn("[CSRF] Blocked cross-site request via Sec-Fetch-Site:", { path: req.path });
      return res.status(403).json({
        success: false,
        code: "CSRF_VALIDATION_FAILED",
        error: "Cross-site request forgery protection rejected this request. Please refresh the page.",
      });
    }

    // If Origin or Referer is present, verify it matches host or local environment
    if (origin || referer) {
      const isLocal =
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        referer.includes("localhost") ||
        referer.includes("127.0.0.1");
      const isMatchingHost = (origin && origin.includes(host)) || (referer && referer.includes(host));

      if (!isLocal && !isMatchingHost) {
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
    } else {
      // If neither Origin nor Referer is present on a cookie-authenticated state-changing request,
      // and no valid CSRF token was supplied, reject to prevent blind CSRF via stripped referrers
      logger.warn("[CSRF] Blocked cookie request lacking Origin, Referer, and CSRF token:", {
        method: req.method,
        path: req.path,
      });
      return res.status(403).json({
        success: false,
        code: "CSRF_VALIDATION_FAILED",
        error: "Cross-site request forgery protection rejected this request. Missing request origin verification.",
      });
    }
  }

  next();
}
