import { userRepository } from "../repositories/UserRepository.js";
import { hashPassword, verifyPassword, sanitizeUser } from "../utils/crypto.js";
import { createSessionRecord, deleteSessionRecord, getSessionRecord } from "../middleware/auth.js";
import { SanitizedUser, UserSession } from "../models/types.js";

export interface LoginResult {
  token: string;
  user: SanitizedUser;
}

export class AuthService {
  async login(identifier: string, password: string): Promise<{ success: boolean; code?: string; error?: string; result?: LoginResult }> {
    const cleanId = String(identifier).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const user = await userRepository.getByIdOrEmail(cleanId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        error: `No account found for "${identifier}". Please check your credentials or create a new account.`,
      };
    }

    const isValid = verifyPassword(cleanPassword, user.password);
    if (!isValid) {
      return {
        success: false,
        code: "INVALID_CREDENTIALS",
        error: "Incorrect password. Please verify your password and try again.",
      };
    }

    // Auto-upgrade legacy plaintext password to scrypt hash on successful login
    if (user.password && !user.password.startsWith("scrypt:")) {
      user.password = hashPassword(cleanPassword);
      await userRepository.save(user).catch(console.warn);
    }

    const token = createSessionRecord(user);
    const sanitized = sanitizeUser(user);

    return {
      success: true,
      result: {
        token,
        user: sanitized!,
      },
    };
  }

  logout(token: string): boolean {
    return deleteSessionRecord(token);
  }

  getSession(token: string): UserSession | null {
    return getSessionRecord(token);
  }

  async getMe(userId: string): Promise<SanitizedUser | null> {
    const user = await userRepository.getByIdOrEmail(userId);
    return sanitizeUser(user);
  }
}

export const authService = new AuthService();
