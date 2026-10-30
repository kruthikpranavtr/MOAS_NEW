import { Router } from "express";
import { authController } from "../../controllers/AuthController.js";
import { requireAuth, verifyCsrf } from "../../middleware/auth.js";
import { authRateLimiter } from "../../middleware/rateLimiter.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

// Registration
router.post(
  "/register",
  authRateLimiter,
  validateBody(["name", "email", "password"]),
  (req, res) => authController.register(req, res)
);

// Login & Logout
router.post(
  "/login",
  authRateLimiter,
  validateBody(["identifier", "password"]),
  (req, res) => authController.login(req, res)
);

router.post("/logout", (req, res) => authController.logout(req, res));

// Current Session Profile
router.get("/me", requireAuth, (req, res) => authController.getMe(req, res));

// Password Reset Flow
router.post(
  "/password/forgot",
  authRateLimiter,
  (req, res) => authController.forgotPassword(req, res)
);

router.get("/password/verify-token", (req, res) => authController.verifyResetToken(req, res));

router.post(
  "/password/reset",
  authRateLimiter,
  validateBody(["token", "newPassword"]),
  (req, res) => authController.resetPassword(req, res)
);

// Email Verification Flow
router.post("/email/send-verification", requireAuth, (req, res) =>
  authController.sendEmailVerification(req, res)
);

router.post("/email/verify", (req, res) => authController.verifyEmail(req, res));

export default router;
