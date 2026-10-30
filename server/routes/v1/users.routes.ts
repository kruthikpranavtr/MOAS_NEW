import { Router } from "express";
import { userController } from "../../controllers/UserController.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { authRateLimiter } from "../../middleware/rateLimiter.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

router.get("/", (req, res) => userController.getAllUsers(req, res));
router.get("/:id", (req, res) => userController.getUserById(req, res));
router.post(
  "/",
  authRateLimiter,
  validateBody(["name", "email", "role"]),
  (req, res) => userController.registerUser(req, res)
);
router.put("/:id", requireAuth, (req, res) => userController.updateProfile(req, res));
router.patch("/:id/role", requireAuth, requireAdmin, validateBody(["role"]), (req, res) =>
  userController.updateUserRole(req, res)
);
router.post("/update-photo", requireAuth, validateBody(["photoUrl"]), (req, res) =>
  userController.updatePhoto(req, res)
);

export default router;
