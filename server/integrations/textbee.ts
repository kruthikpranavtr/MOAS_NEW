import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export interface SendSmsResult {
  success: boolean;
  smsSent: boolean;
  message: string;
  smsBatchId?: string;
}

export async function sendTextBeeSms(recipientPhone: string, messageBody: string): Promise<SendSmsResult> {
  const { apiKey, deviceId, isConfigured } = config.integrations.textbee;

  if (!isConfigured || !apiKey || !deviceId) {
    logger.warn("[OTP] TextBee credentials not configured. Configure TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID in .env.");
    return {
      success: false,
      smsSent: false,
      message: "SMS gateway is not configured.",
    };
  }

  try {
    const response = await fetch("https://api.textbee.dev/api/v1/gateway/send-sms", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        deviceId,
        recipients: [recipientPhone],
        message: messageBody,
      }),
    });

    const outcome = response.ok ? (await response.json())?.data : undefined;
    if (!response.ok || outcome?.success === false || outcome?.successCount === 0 || outcome?.failureCount > 0) {
      logger.error(`[OTP] TextBee SMS dispatch failed (HTTP ${response.status}).`);
      return {
        success: false,
        smsSent: false,
        message: "The SMS gateway could not send the verification code. Please try again.",
      };
    }

    return {
      success: true,
      smsSent: true,
      message: "SMS accepted by the gateway.",
      smsBatchId: outcome?.smsBatchId,
    };
  } catch (error) {
    logger.error("[OTP] TextBee request failed:", error instanceof Error ? error.name : "Unknown error");
    return {
      success: false,
      smsSent: false,
      message: "The SMS gateway is unavailable. Please try again.",
    };
  }
}
