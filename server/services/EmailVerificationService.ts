import { emailVerificationRepository } from "../repositories/EmailVerificationRepository.js";
import { userRepository } from "../repositories/UserRepository.js";
import { generateSecureToken, hashToken } from "../utils/crypto.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export class EmailVerificationService {
  private readonly VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  async sendVerificationEmail(userId: string): Promise<{ success: boolean; message: string; debugVerificationToken?: string }> {
    if (!userId) {
      throw new Error("User ID is required to send verification email.");
    }

    const user = await userRepository.getByIdOrEmail(userId);
    if (!user) {
      throw new Error("User account not found.");
    }

    if (user.emailVerified) {
      return { success: true, message: "Email is already verified." };
    }

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.VERIFY_TTL_MS);

    await emailVerificationRepository.create({
      userId: user.id,
      email: user.email,
      tokenHash,
      expiresAt,
    });

    logger.info(`[EmailVerification] Verification token generated for user ${user.id} (${user.email}).`);

    const result: { success: boolean; message: string; debugVerificationToken?: string } = {
      success: true,
      message: `Verification instructions sent to ${user.email}.`,
    };

    const isTestMode = config.app.isTest || process.env.NODE_ENV === "test";
    if (isTestMode) {
      result.debugVerificationToken = rawToken;
    }

    return result;
  }

  async verifyEmail(rawToken: string): Promise<{ success: boolean; message: string; email?: string }> {
    if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
      throw new Error("A valid email verification token is required.");
    }

    const tokenHash = hashToken(rawToken.trim());
    const record = await emailVerificationRepository.getByTokenHash(tokenHash);

    if (!record) {
      throw new Error("Invalid or expired email verification token.");
    }

    const user = await userRepository.getByIdOrEmail(record.userId);
    if (!user) {
      throw new Error("User account associated with this verification was not found.");
    }

    user.emailVerified = true;
    await userRepository.save(user);

    await emailVerificationRepository.markVerified(record.id);
    logger.info(`[EmailVerification] Email ${user.email} marked as verified for user ${user.id}.`);

    return {
      success: true,
      message: "Email address verified successfully.",
      email: user.email,
    };
  }
}

export const emailVerificationService = new EmailVerificationService();
