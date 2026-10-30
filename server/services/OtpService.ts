import crypto from "crypto";
import { otpRepository, DbOtpRecord } from "../repositories/OtpRepository.js";
import { userRepository } from "../repositories/UserRepository.js";
import { sendTextBeeSms, SendSmsResult } from "../integrations/textbee.js";
import { generateNumericOtp, hashOtp } from "../utils/crypto.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export class OtpService {
  private readonly OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
  private readonly MAX_ATTEMPTS = 5;

  normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-()]/g, "");
    if (!cleaned.startsWith("+")) {
      if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
      if (cleaned.length === 10) cleaned = "+91" + cleaned;
    }
    return cleaned;
  }

  async sendOtp(
    phone: string,
    resend = false,
    purpose = "phone_verification"
  ): Promise<SendSmsResult & { normalizedPhone: string; debugOtp?: string }> {
    if (!phone || typeof phone !== "string" || phone.trim().length < 10) {
      throw new Error("A valid phone number is required (minimum 10 digits).");
    }

    const normalizedPhone = this.normalizePhone(phone.trim());
    const existing = await otpRepository.getLatestActive(normalizedPhone, purpose);
    const now = Date.now();

    // Check resend cooldown
    if (existing && new Date(existing.resendAvailableAt).getTime() > now) {
      const waitSeconds = Math.ceil((new Date(existing.resendAvailableAt).getTime() - now) / 1000);
      throw new Error(`Please wait ${waitSeconds}s before requesting another verification code.`);
    }

    // Generate secure 6-digit OTP
    const rawOtp = generateNumericOtp();
    const otpHash = hashOtp(rawOtp, normalizedPhone);
    const expiresAt = new Date(now + this.OTP_TTL_MS);
    const resendAvailableAt = new Date(now + this.RESEND_COOLDOWN_MS);

    // Persist securely to PostgreSQL (hashed at rest)
    await otpRepository.create({
      identifier: normalizedPhone,
      otpHash,
      purpose,
      expiresAt,
      resendAvailableAt,
      maxAttempts: this.MAX_ATTEMPTS,
    });

    const smsBody = `[MOAS] Your verification code is: ${rawOtp}. Valid for 5 minutes. Do not share this code.`;
    logger.info(`[OTP] Dispatching verification code to ${normalizedPhone} (purpose: ${purpose})...`);

    // Provider call
    const smsResult = await sendTextBeeSms(normalizedPhone, smsBody);

    const response: SendSmsResult & { normalizedPhone: string; debugOtp?: string } = {
      ...smsResult,
      normalizedPhone,
    };

    // Only in automated test environment: expose debugOtp for test assertions
    const isTestMode = config.app.isTest || process.env.NODE_ENV === "test";
    if (isTestMode) {
      response.debugOtp = rawOtp;
    }

    return response;
  }

  async verifyOtp(
    phone: string,
    enteredOtp: string,
    purpose = "phone_verification"
  ): Promise<{
    verified: boolean;
    attemptsRemaining?: number;
    message: string;
    statusCode?: number;
    normalizedPhone?: string;
  }> {
    if (!phone || !enteredOtp) {
      throw new Error("Phone number and OTP code are required.");
    }

    const normalizedPhone = this.normalizePhone(phone.trim());
    const cleanEntered = String(enteredOtp).replace(/\D/g, "");

    if (cleanEntered.length !== 6) {
      return {
        verified: false,
        message: "Verification code must be exactly 6 digits.",
        statusCode: 400,
      };
    }

    const stored = await otpRepository.getLatestActive(normalizedPhone, purpose);
    if (!stored) {
      return {
        verified: false,
        message: "No active verification code found for this phone number. Please request a new code.",
        statusCode: 400,
      };
    }

    const now = Date.now();
    if (new Date(stored.expiresAt).getTime() <= now) {
      await otpRepository.markVerified(stored.id);
      return {
        verified: false,
        message: "Verification code has expired. Please request a new code.",
        statusCode: 400,
      };
    }

    if (stored.attempts >= stored.maxAttempts) {
      await otpRepository.markVerified(stored.id);
      return {
        verified: false,
        message: "Maximum verification attempts exceeded. Please request a new code.",
        statusCode: 429,
      };
    }

    // Verify hash using constant-time comparison
    const enteredHash = hashOtp(cleanEntered, normalizedPhone);
    const bufA = Buffer.from(enteredHash, "hex");
    const bufB = Buffer.from(stored.otpHash, "hex");
    const isMatch = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);

    if (isMatch) {
      await otpRepository.markVerified(stored.id);

      // Update phone_verified flag in users table if user exists
      const user = await userRepository.getByIdOrEmail(normalizedPhone);
      if (user) {
        user.phoneVerified = true;
        await userRepository.save(user).catch((err) =>
          logger.warn("[OTP] Failed to update user phoneVerified flag:", err?.message)
        );
      }

      logger.info(`[OTP] Verification SUCCESS for ${normalizedPhone} (purpose: ${purpose})`);
      return {
        verified: true,
        message: "Phone number verified successfully.",
        normalizedPhone,
      };
    } else {
      const currentAttempts = await otpRepository.incrementAttempts(stored.id);
      const attemptsRemaining = Math.max(0, stored.maxAttempts - currentAttempts);

      if (attemptsRemaining === 0) {
        await otpRepository.markVerified(stored.id);
        return {
          verified: false,
          attemptsRemaining: 0,
          message: "Incorrect code. Maximum attempts reached. Please request a new code.",
          statusCode: 429,
        };
      }

      return {
        verified: false,
        attemptsRemaining,
        message: `Incorrect verification code. ${attemptsRemaining} attempt(s) remaining.`,
        statusCode: 400,
      };
    }
  }
}

export const otpService = new OtpService();
