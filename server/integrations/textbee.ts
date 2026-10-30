import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export interface SendSmsResult {
  success: boolean;
  smsSent: boolean;
  message: string;
  smsBatchId?: string;
  textbeeError?: any;
}

export async function sendTextBeeSms(recipientPhone: string, messageBody: string): Promise<SendSmsResult> {
  const { apiKey, deviceId, isConfigured } = config.integrations.textbee;

  if (!isConfigured || !apiKey || !deviceId) {
    logger.warn("[OTP] TextBee credentials not configured. Configure TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID in .env.");
    return {
      success: true,
      smsSent: false,
      message: "SMS gateway is not configured.",
    };
  }

  try {
    const response = await fetch("https://api.textbee.dev/api/v1/gateway/send-sms", {
      method: "POST",
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

    const result = await response.json();

    if (!response.ok) {
      logger.error("[OTP] TextBee SMS send failed:", result);
      return {
        success: true,
        smsSent: false,
        message: "Failed to dispatch SMS through carrier gateway.",
        textbeeError: result,
      };
    }

    return {
      success: true,
      smsSent: true,
      message: `OTP sent successfully to ${recipientPhone} via SMS.`,
      smsBatchId: result?.data?.smsBatchId,
    };
  } catch (error: any) {
    logger.error("[OTP] TextBee network exception:", error);
    return {
      success: false,
      smsSent: false,
      message: error.message || "Failed to dispatch SMS",
    };
  }
}
