/**
 * MOAS Authentication Module (Legacy Adapter)
 * Delegates to server/middleware/auth.ts, server/models/types.ts, and server/utils/crypto.ts
 */
export type { UserSession } from "./models/types.js";
export type { AuthenticatedRequest } from "./middleware/auth.js";

export {
  createSessionRecord,
  createSession,
  getSessionRecord,
  getSession,
  deleteSessionRecord,
  deleteSession,
  extractToken,
  requireAuth,
  optionalAuth,
  requireRole,
  setSessionCookie,
  clearSessionCookie,
  verifyCsrf,
} from "./middleware/auth.js";

export {
  hashPassword,
  verifyPassword,
  sanitizeUser,
  generateSecureToken,
  hashToken,
  hashOtp,
  generateNumericOtp,
  validatePasswordStrength,
} from "./utils/crypto.js";
