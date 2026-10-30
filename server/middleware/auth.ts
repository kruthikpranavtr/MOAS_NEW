import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { UserSession } from "../models/types.js";
import { config } from "../config/index.js";

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

// In-Memory Session Store with 24-hour TTL
const activeSessions = new Map<string, UserSession>();

export function createSessionRecord(user: {
  id: string;
  username?: string;
  email: string;
  role: string;
  name: string;
}): string {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const session: UserSession = {
    token,
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    name: user.name,
    createdAt: now,
    expiresAt: now + config.auth.sessionTtlMs,
  };
  activeSessions.set(token, session);
  return token;
}

export function getSessionRecord(token: string): UserSession | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

export function deleteSessionRecord(token: string): boolean {
  return activeSessions.delete(token);
}

export function clearAllSessionRecords(): void {
  activeSessions.clear();
}

export const createSession = createSessionRecord;
export const getSession = getSessionRecord;
export const deleteSession = deleteSessionRecord;
export const clearAllSessions = clearAllSessionRecords;

/**
 * Extracts session token from Authorization header, Cookie, or custom headers
 */
export function extractToken(req: Request): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  // 2. HttpOnly Cookie: moas_session_token
  const cookieToken = req.cookies?.[config.auth.cookieName];
  if (typeof cookieToken === "string" && cookieToken.trim()) {
    return cookieToken.trim();
  }

  // 3. Fallback custom header
  const customHeader = req.headers["x-session-token"] || req.headers["x-auth-token"];
  if (typeof customHeader === "string" && customHeader.trim()) {
    return customHeader.trim();
  }

  return null;
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(config.auth.cookieName, token, config.auth.cookieOptions);
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(config.auth.cookieName, {
    path: "/",
    httpOnly: true,
  });
}

/**
 * Express middleware requiring a valid authenticated session
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required. Please log in with valid credentials.",
    });
  }

  const session = getSessionRecord(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      code: "SESSION_EXPIRED",
      error: "Invalid or expired session token. Please log in again.",
    });
  }

  req.user = session;
  next();
}

/**
 * Express middleware enriching req.user if a valid token is provided without blocking
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const session = getSessionRecord(token);
    if (session) {
      req.user = session;
    }
  }
  next();
}

/**
 * Express middleware requiring specific roles
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
