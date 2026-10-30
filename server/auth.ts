import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

export interface UserSession {
  token: string;
  userId: string;
  username?: string;
  email: string;
  role: string;
  name: string;
  createdAt: number;
  expiresAt: number;
}

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

// 24-hour session TTL
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// In-Memory Session Store
const activeSessions = new Map<string, UserSession>();

/**
 * Hashes a plaintext password using crypto.scrypt with a unique random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored hash using timing-safe comparison.
 * Supports legacy plaintext migration for existing seeded accounts.
 */
export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash || !password) return false;

  // If stored in modern scrypt format
  if (storedHash.startsWith("scrypt:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expectedHex = parts[2];

    const actualKey = crypto.scryptSync(password, salt, 64);
    const expectedBuf = Buffer.from(expectedHex, "hex");
    if (actualKey.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(actualKey, expectedBuf);
  }

  // Legacy plaintext fallback with constant-time equality
  try {
    const bufA = Buffer.from(password, "utf8");
    const bufB = Buffer.from(storedHash, "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Creates an authenticated session for a user and returns a cryptographically secure token
 */
export function createSession(user: {
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
    expiresAt: now + SESSION_TTL_MS,
  };
  activeSessions.set(token, session);
  return token;
}

/**
 * Retrieves a session by token, pruning if expired
 */
export function getSession(token: string): UserSession | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

/**
 * Deletes an active session (logout)
 */
export function deleteSession(token: string): boolean {
  return activeSessions.delete(token);
}

/**
 * Completely purges all active sessions (for test cleanup)
 */
export function clearAllSessions(): void {
  activeSessions.clear();
}

/**
 * Strips password and sensitive fields from any user object before sending to client
 */
export function sanitizeUser<T extends Record<string, any>>(user: T | null | undefined): any {
  if (!user) return null;
  const copy = { ...user } as any;
  delete copy.password;
  delete copy.passwordHash;
  return copy;
}

/**
 * Extracts bearer token from Authorization header or custom header
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  const customHeader = req.headers["x-session-token"] || req.headers["x-auth-token"];
  if (typeof customHeader === "string") {
    return customHeader.trim();
  }
  return null;
}

/**
 * Express middleware requiring a valid authenticated session
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please log in with valid credentials.",
    });
  }
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired session token. Please log in again.",
    });
  }
  req.user = session;
  next();
}

/**
 * Express middleware that enriches req.user if a valid token is provided, without blocking unauthenticated requests
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const session = getSession(token);
    if (session) {
      req.user = session;
    }
  }
  next();
}

/**
 * Express middleware requiring specific roles (e.g. Employer or Candidate)
 */
export function requireRole(allowedRoles: string[]) {
  const normalized = allowedRoles.map((r) => r.toLowerCase());
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    const userRole = (req.user.role || "").toLowerCase();
    if (!normalized.includes(userRole) && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: `Access denied. Action restricted to ${allowedRoles.join(" or ")} accounts.`,
      });
    }
    next();
  };
}
