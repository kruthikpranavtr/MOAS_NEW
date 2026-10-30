import { Router } from "express";
import { databaseAdminController } from "../../controllers/DatabaseAdminController.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const router = Router();

router.get("/status", (req, res) => databaseAdminController.getStatus(req, res));
router.get("/postgres/status", (req, res) => databaseAdminController.getPostgresStatus(req, res));
router.get(
  "/postgres/tables/:table",
  requireAuth,
  requireRole(["Admin"]),
  (req, res) => databaseAdminController.getTableRows(req, res)
);
router.post(
  "/seed",
  requireAuth,
  requireRole(["Admin"]),
  (req, res) => databaseAdminController.seedData(req, res)
);

export default router;
