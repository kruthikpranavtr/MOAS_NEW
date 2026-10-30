import helmet from "helmet";
import { config } from "../config/index.js";

export const securityHeadersMiddleware = helmet({
  xFrameOptions: { action: "deny" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        ...(config.app.isProduction ? [] : ["'unsafe-eval'"]),
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://images.unsplash.com",
        "https://*.unsplash.com",
      ],
      connectSrc: [
        "'self'",
        "https://api.textbee.dev",
        "https://identitytoolkit.googleapis.com",
        "https://firestore.googleapis.com",
        "https://*.googleapis.com",
        "https://*.firebaseio.com",
        "wss:",
        "ws:",
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});
