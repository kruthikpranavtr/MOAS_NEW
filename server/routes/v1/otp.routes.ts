import { Router } from "express";
import { otpController } from "../../controllers/OtpController.js";
import { otpRateLimiter } from "../../middleware/rateLimiter.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

router.post("/send", otpRateLimiter, validateBody(["phone"]), (req, res) =>
  otpController.sendOtp(req, res)
);

router.post("/verify", otpRateLimiter, validateBody(["phone", "otp"]), (req, res) =>
  otpController.verifyOtp(req, res)
);

export default router;
