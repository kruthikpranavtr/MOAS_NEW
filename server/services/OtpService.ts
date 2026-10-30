import crypto from "crypto";
import { sendTextBeeSms, SendSmsResult } from "../integrations/textbee.js";
import { logger } from "../utils/logger.js";

interface StoredOtp {
  otp: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

export class OtpService {
  private readonly otpStore = new Map<string, StoredOtp>();
  private readonly OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ATTEMPTS = 5;

  normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-()]/g, "");
    if (!cleaned.startsWith("+")) {
      if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
      if (cleaned.length === 10) cleaned = "+91" + cleaned;
    }
    return cleaned;
  }

  generateOtp(): string {
    // Generate secure 6-digit numeric OTP
    const num = crypto.randomInt(100000, 999999);
    return num.toString();
  }

  async sendOtp(phone: string, resend?: boolean): Promise<SendSmsResult & { normalizedPhone: string }> {
    if (!phone || typeof phone !== "string" || phone.trim().length < 10) {
      throw new Error("A valid phone number is required.");
    }

    const normalizedPhone = this.normalizePhone(phone.trim());
    const existing = this.otpStore.get(normalizedPhone);
    const now = Date.now();

    // Prevent duplicate dispatch within 20s if not explicit resend
    if (!resend && existing && now - existing.createdAt < 20000 && now < existing.expiresAt) {
      logger.info(`[OTP] Duplicate send request for ${normalizedPhone} within 20s. Reusing active OTP.`);
      return {
        success: true,
        smsSent: true,
        message: `OTP already dispatched via SMS to ${normalizedPhone}.`,
        normalizedPhone,
      };
    }

    const otp = this.generateOtp();

    this.otpStore.set(normalizedPhone, {
      otp,
      expiresAt: now + this.OTP_TTL_MS,
      attempts: 0,
      createdAt: now,
    });

    const smsBody = `[MOAS] Your verification code is: ${otp}. This code expires in 5 minutes. Do not share this code with anyone.`;
    logger.info(`[OTP] Sending OTP to ${normalizedPhone} via TextBee...`);

    const result = await sendTextBeeSms(normalizedPhone, smsBody);
    return {
      ...result,
      normalizedPhone,
    };
  }

  verifyOtp(phone: string, enteredOtp: string): { verified: boolean; attemptsRemaining?: number; message: string; statusCode?: number } {
    if (!phone || !enteredOtp) {
      throw new Error("Phone number and OTP are required.");
    }

    const normalizedPhone = this.normalizePhone(phone.trim());
    const stored = this.otpStore.get(normalizedPhone);

    if (!stored) {
      return {
        verified: false,
        message: "No active OTP found for this number. Please click 'Resend OTP'.",
        statusCode: 400,
      };
    }

    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(normalizedPhone);
      return {
        verified: false,
        message: "Verification code has expired. Please request a new one.",
        statusCode: 400,
      };
    }

    if (stored.attempts >= this.MAX_ATTEMPTS) {
      this.otpStore.delete(normalizedPhone);
      return {
        verified: false,
        message: "Maximum attempts reached. Please request a new OTP.",
        statusCode: 429,
      };
    }

    const cleanEntered = String(enteredOtp).replace(/\D/g, "");
    stored.attempts += 1;

    if (cleanEntered === stored.otp) {
      this.otpStore.delete(normalizedPhone); // One-time use deletion
      logger.info(`[OTP] Verification SUCCESS for ${normalizedPhone}`);
      return {
        verified: true,
        message: "OTP verified successfully!",
      };
    }

    const attemptsRemaining = Math.max(0, this.MAX_ATTEMPTS - stored.attempts);
    logger.info(`[OTP] Verification FAILED for ${normalizedPhone} — ${attemptsRemaining} attempts left`);

    return {
      verified: false,
      attemptsRemaining,
      message: attemptsRemaining > 0
        ? `Incorrect verification code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`
        : "Maximum attempts reached. Please request a new OTP.",
    };
  }
}

export const otpService = new OtpService();
