import { Request, Response } from "express";
import { otpService } from "../services/OtpService.js";
import { logger } from "../utils/logger.js";

export class OtpController {
  async sendOtp(req: Request, res: Response) {
    try {
      const { phone, resend, purpose } = req.body;
      if (!phone || typeof phone !== "string" || phone.trim().length < 10) {
        return res.status(400).json({ success: false, error: "A valid phone number is required (minimum 10 digits)." });
      }

      const result = await otpService.sendOtp(phone, !!resend, purpose || "phone_verification");
      return res.json({
        success: result.success,
        smsSent: result.smsSent,
        message: result.message,
        smsBatchId: result.smsBatchId,
        textbeeError: result.textbeeError,
        ...(result.debugOtp ? { debugOtp: result.debugOtp } : {}),
      });
    } catch (error: any) {
      logger.error("[OTP] Error sending OTP:", error?.message);
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to send OTP.",
      });
    }
  }

  async verifyOtp(req: Request, res: Response) {
    try {
      const { phone, otp, purpose } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ success: false, error: "Phone number and OTP code are required." });
      }

      const result = await otpService.verifyOtp(phone, otp, purpose || "phone_verification");
      if (result.statusCode) {
        return res.status(result.statusCode).json({
          success: false,
          verified: false,
          error: result.message,
          attemptsRemaining: result.attemptsRemaining,
        });
      }

      return res.json({
        success: true,
        verified: result.verified,
        attemptsRemaining: result.attemptsRemaining,
        message: result.message,
      });
    } catch (error: any) {
      logger.error("[OTP] Error verifying OTP:", error?.message);
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to verify OTP.",
      });
    }
  }
}

export const otpController = new OtpController();
