import crypto from "crypto";
import { SanitizedUser, UserRecord } from "../models/types.js";

/**
 * Hashes a plaintext password using crypto.scrypt with a unique random 16-byte salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored hash using constant-time comparison
 */
export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash || !password) return false;

  // Modern scrypt format: scrypt:<salt>:<hash>
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

  // Legacy plaintext fallback with timing-safe comparison
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
 * Generates a cryptographically secure random session token
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Strips password and passwordHash from any user object before transmission
 */
export function sanitizeUser<T extends Partial<UserRecord>>(user: T | null | undefined): SanitizedUser | null {
  if (!user) return null;
  const copy = { ...user } as any;
  delete copy.password;
  delete copy.passwordHash;
  return copy as SanitizedUser;
}
