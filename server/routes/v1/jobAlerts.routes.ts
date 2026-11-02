import { Router } from "express";
import { jobAlertController } from "../../controllers/JobAlertController.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (req, res) => jobAlertController.getAlerts(req, res));
router.post("/", requireAuth, (req, res) => jobAlertController.createAlert(req, res));
router.post("/process", requireAuth, (req, res) => jobAlertController.processAlerts(req, res));
router.get("/:id", requireAuth, (req, res) => jobAlertController.getAlertById(req, res));
router.put("/:id", requireAuth, (req, res) => jobAlertController.updateAlert(req, res));
router.patch("/:id/toggle", requireAuth, (req, res) => jobAlertController.toggleAlert(req, res));
router.delete("/:id", requireAuth, (req, res) => jobAlertController.deleteAlert(req, res));

export default router;
