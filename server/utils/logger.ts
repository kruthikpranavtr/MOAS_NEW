const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "authorization",
  "otp",
  "cookie",
  "apikey",
  "secret",
  "dataurl",
]);

function redact(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redact);

  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      cleaned[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      cleaned[key] = redact(val);
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

export const logger = {
  info: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === "test") return;
    const timestamp = new Date().toISOString();
    if (meta) {
      console.log(`[${timestamp}] [INFO] ${message}`, redact(meta));
    } else {
      console.log(`[${timestamp}] [INFO] ${message}`);
    }
  },

  warn: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.warn(`[${timestamp}] [WARN] ${message}`, redact(meta));
    } else {
      console.warn(`[${timestamp}] [WARN] ${message}`);
    }
  },

  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    const errObj = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : redact(error);
    console.error(`[${timestamp}] [ERROR] ${message}`, errObj);
  },

  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") return;
    const timestamp = new Date().toISOString();
    if (meta) {
      console.debug(`[${timestamp}] [DEBUG] ${message}`, redact(meta));
    } else {
      console.debug(`[${timestamp}] [DEBUG] ${message}`);
    }
  },
};
