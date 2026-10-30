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
  databaseUrl: string;
  dbPoolMin: number;
  dbPoolMax: number;
  dbConnectionTimeoutMs: number;
  dbIdleTimeoutMs: number;
  dbSsl: boolean;
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

  // PostgreSQL Configuration
  const defaultDevDbUrl = "postgresql://mindaura:mindaura_dev_pw@127.0.0.1:5432/mindaura?options=-c%20search_path%3Dmoas,public";
  const defaultTestDbUrl = "postgresql://mindaura:mindaura_dev_pw@127.0.0.1:5432/mindaura_test?options=-c%20search_path%3Dmoas,public";

  const databaseUrl = isTest
    ? (process.env.DATABASE_TEST_URL || process.env.DATABASE_URL || defaultTestDbUrl)
    : (process.env.DATABASE_URL || defaultDevDbUrl);

  const dbPoolMin = parseInt(process.env.DB_POOL_MIN || "2", 10);
  const dbPoolMax = parseInt(process.env.DB_POOL_MAX || "10", 10);
  const dbConnectionTimeoutMs = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || "5000", 10);
  const dbIdleTimeoutMs = parseInt(process.env.DB_IDLE_TIMEOUT_MS || "10000", 10);
  const dbSsl = process.env.DATABASE_SSL === "true";

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
    databaseUrl,
    dbPoolMin,
    dbPoolMax,
    dbConnectionTimeoutMs,
    dbIdleTimeoutMs,
    dbSsl,
  };
}

export const env = validateEnvironment();
