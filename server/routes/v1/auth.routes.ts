import { Router } from "express";
import { authController } from "../../controllers/AuthController.js";
import { requireAuth } from "../../middleware/auth.js";
import { authRateLimiter } from "../../middleware/rateLimiter.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

router.post(
  "/login",
  authRateLimiter,
  validateBody(["identifier", "password"]),
  (req, res) => authController.login(req, res)
);

router.post("/logout", (req, res) => authController.logout(req, res));

router.get("/me", requireAuth, (req, res) => authController.getMe(req, res));

export default router;
