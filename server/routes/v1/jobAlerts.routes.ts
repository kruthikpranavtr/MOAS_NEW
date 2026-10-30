import { Router } from "express";
import { jobAlertController } from "../../controllers/JobAlertController.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (req, res) => jobAlertController.getAlerts(req, res));
router.post("/", requireAuth, (req, res) => jobAlertController.createAlert(req, res));
router.delete("/:id", requireAuth, (req, res) => jobAlertController.deleteAlert(req, res));

export default router;
