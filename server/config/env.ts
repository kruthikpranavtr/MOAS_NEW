import dotenv from "dotenv";

dotenv.config();

export interface EnvironmentConfig {
  port: number;
  nodeEnv: "development" | "production" | "test";
  isProduction: boolean;
  isTest: boolean;
  geminiApiKey?: string;
  appUrl: string;
  sessionSecret: string;
  sessionTtlMs: number;
  textbeeApiKey?: string;
  textbeeDeviceId?: string;
  gmailUser?: string;
  gmailAppPassword?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  cookieSecure: boolean;
}

export function validateEnvironment(): EnvironmentConfig {
  const nodeEnv = (process.env.NODE_ENV || "development").toLowerCase() as "development" | "production" | "test";
  const port = parseInt(process.env.PORT || "3000", 10) || 3000;
  const isProduction = nodeEnv === "production";
  const isTest = nodeEnv === "test";

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const appUrl = process.env.APP_URL || `http://localhost:${port}`;
  const sessionSecret = process.env.SESSION_SECRET || "moas-secure-session-signing-secret-2026";
  const sessionTtlMs = 24 * 60 * 60 * 1000; // 24 hours

  const textbeeApiKey = process.env.TEXTBEE_API_KEY;
  const textbeeDeviceId = process.env.TEXTBEE_DEVICE_ID;

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  // Cookie secure flag (true only in production when served over HTTPS or behind proxy)
  const cookieSecure = isProduction && process.env.COOKIE_SECURE === "true";

  return {
    port,
    nodeEnv,
    isProduction,
    isTest,
    geminiApiKey,
    appUrl,
    sessionSecret,
    sessionTtlMs,
    textbeeApiKey,
    textbeeDeviceId,
    gmailUser,
    gmailAppPassword,
    twilioAccountSid,
    twilioAuthToken,
    twilioPhoneNumber,
    cookieSecure,
  };
}

export const env = validateEnvironment();
