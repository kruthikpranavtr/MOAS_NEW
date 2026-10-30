import { Router } from "express";
import { adminController } from "../../controllers/AdminController.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

// All admin routes require authentication and Admin role
router.use(requireAuth);
router.use(requireAdmin);

router.get("/audit-logs", (req, res) => adminController.getAuditLogs(req, res));
router.patch("/users/:id/role", validateBody(["role"]), (req, res) =>
  adminController.updateUserRole(req, res)
);
router.patch("/companies/:id/verify", (req, res) =>
  adminController.verifyCompany(req, res)
);

export default router;
