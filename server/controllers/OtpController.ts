import { Request, Response } from "express";
import { otpService } from "../services/OtpService.js";
import { logger } from "../utils/logger.js";

export class OtpController {
  async sendOtp(req: Request, res: Response) {
    try {
      const { phone, resend } = req.body;
      if (!phone || typeof phone !== "string" || phone.trim().length < 10) {
        return res.status(400).json({ success: false, error: "A valid phone number is required." });
      }

      const result = await otpService.sendOtp(phone, resend);
      return res.json({
        success: result.success,
        smsSent: result.smsSent,
        message: result.message,
        smsBatchId: result.smsBatchId,
        textbeeError: result.textbeeError,
      });
    } catch (error: any) {
      logger.error("[OTP] Error sending OTP:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to send OTP.",
        message: error.message,
      });
    }
  }

  async verifyOtp(req: Request, res: Response) {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ success: false, error: "Phone number and OTP are required." });
      }

      const result = otpService.verifyOtp(phone, otp);
      if (result.statusCode) {
        return res.status(result.statusCode).json({
          success: false,
          error: result.message,
        });
      }

      return res.json({
        success: true,
        verified: result.verified,
        attemptsRemaining: result.attemptsRemaining,
        message: result.message,
      });
    } catch (error: any) {
      logger.error("[OTP] Error verifying OTP:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to verify OTP.",
        message: error.message,
      });
    }
  }
}

export const otpController = new OtpController();
