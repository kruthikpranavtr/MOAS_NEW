import { passwordResetRepository } from "../repositories/PasswordResetRepository.js";
import { userRepository } from "../repositories/UserRepository.js";
import { sessionRepository } from "../repositories/SessionRepository.js";
import { generateSecureToken, hashToken, hashPassword, validatePasswordStrength } from "../utils/crypto.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export class PasswordResetService {
  private readonly RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

  async requestPasswordReset(identifier: string): Promise<{ success: boolean; message: string; debugResetToken?: string }> {
    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      throw new Error("Email or username is required.");
    }

    const cleanId = identifier.trim().toLowerCase();
    const user = await userRepository.getByIdOrEmail(cleanId);

    // Standard anti-enumeration response
    const genericResponse = {
      success: true,
      message: "If an account matches that identifier, password reset instructions have been issued.",
    };

    if (!user) {
      logger.info(`[PasswordReset] Request for non-existent user identifier: ${cleanId}`);
      return genericResponse;
    }

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.RESET_TTL_MS);

    await passwordResetRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    logger.info(`[PasswordReset] Reset token generated for user ${user.id} (${user.email}).`);

    // In a production environment, send an email with the link `https://app.moas.ai/reset-password?token=${rawToken}`
    const result: { success: boolean; message: string; debugResetToken?: string } = {
      ...genericResponse,
    };

    const isTestMode = config.app.isTest || process.env.NODE_ENV === "test";
    if (isTestMode) {
      result.debugResetToken = rawToken;
    }

    return result;
  }

  async verifyResetToken(rawToken: string): Promise<{ valid: boolean; message: string; userId?: string }> {
    if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
      return { valid: false, message: "A valid reset token is required." };
    }

    const tokenHash = hashToken(rawToken.trim());
    const record = await passwordResetRepository.getByTokenHash(tokenHash);

    if (!record) {
      return { valid: false, message: "Invalid or expired password reset token." };
    }

    return { valid: true, message: "Reset token is valid.", userId: record.userId };
  }

  async resetPassword(
    rawToken: string,
    newPassword: string,
    confirmPassword?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!rawToken || !newPassword) {
      throw new Error("Reset token and new password are required.");
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      throw new Error("Passwords do not match. Please re-enter your new password.");
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      throw new Error(strength.error || "Password does not meet security requirements.");
    }

    const tokenHash = hashToken(rawToken.trim());
    const resetRecord = await passwordResetRepository.getByTokenHash(tokenHash);

    if (!resetRecord) {
      throw new Error("Invalid or expired password reset token. Please request a new link.");
    }

    const user = await userRepository.getByIdOrEmail(resetRecord.userId);
    if (!user) {
      throw new Error("User account associated with this token was not found.");
    }

    // Hash password with scrypt
    user.password = hashPassword(newPassword);
    await userRepository.save(user);

    // Invalidate reset token
    await passwordResetRepository.markUsed(resetRecord.id);

    // Security requirement: Revoke all existing active sessions for this user
    const revokedCount = await sessionRepository.deleteAllForUser(user.id);
    logger.info(`[PasswordReset] Password changed for user ${user.id}. Revoked ${revokedCount} active session(s).`);

    return {
      success: true,
      message: "Password updated successfully. Please log in with your new credentials.",
    };
  }
}

export const passwordResetService = new PasswordResetService();
