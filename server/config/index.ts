import { env } from "./env.js";

export const config = {
  app: {
    name: "MOAS - ML Opportunities and Algorithmic Services",
    version: "2.1.0",
    port: env.port,
    env: env.nodeEnv,
    isProduction: env.isProduction,
    isTest: env.isTest,
    url: env.appUrl,
  },
  auth: {
    sessionSecret: env.sessionSecret,
    sessionTtlMs: env.sessionTtlMs,
    cookieName: "moas_session_token",
    cookieOptions: {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: (env.isProduction ? "strict" : "lax") as "strict" | "lax",
      maxAge: env.sessionTtlMs,
      path: "/",
    },
  },
  rateLimit: {
    authWindowMs: 15 * 60 * 1000, // 15 minutes
    authMax: 50, // 50 attempts per 15 min window
    otpWindowMs: 10 * 60 * 1000,  // 10 minutes
    otpMax: 10,  // 10 OTP requests per 10 min window
    generalWindowMs: 60 * 1000,   // 1 minute
    generalMax: 300, // 300 requests per minute
  },
  integrations: {
    gemini: {
      apiKey: env.geminiApiKey,
      isConfigured: Boolean(env.geminiApiKey && env.geminiApiKey !== "MY_GEMINI_API_KEY"),
    },
    textbee: {
      apiKey: env.textbeeApiKey,
      deviceId: env.textbeeDeviceId,
      isConfigured: Boolean(env.textbeeApiKey && env.textbeeDeviceId),
    },
    gmail: {
      user: env.gmailUser,
      appPassword: env.gmailAppPassword,
      isConfigured: Boolean(env.gmailUser && env.gmailAppPassword),
    },
    twilio: {
      accountSid: env.twilioAccountSid,
      authToken: env.twilioAuthToken,
      phoneNumber: env.twilioPhoneNumber,
      isConfigured: Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioPhoneNumber),
    },
  },
};

export { env };
