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
  delete copy.password_hash;
  return copy as SanitizedUser;
}

/**
 * Computes SHA-256 hash of a sensitive token (reset token, verification token) for storage at rest
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP code
 */
export function generateNumericOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Computes salted HMAC-SHA256 of an OTP code for secure storage at rest
 */
export function hashOtp(otp: string, identifier: string): string {
  const secret = process.env.SESSION_SECRET || "moas-otp-default-secret-salt-2026";
  return crypto.createHmac("sha256", secret).update(`${identifier}:${otp}`).digest("hex");
}

/**
 * Validates password strength policy
 * Policy: At least 8 characters, with at least 1 uppercase, 1 lowercase, 1 number, and 1 special character
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required." };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter (A-Z)." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter (a-z)." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one numeric digit (0-9)." };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special symbol (e.g. !@#$%^&*)." };
  }
  return { valid: true };
}

