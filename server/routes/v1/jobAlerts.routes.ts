import { Router } from "express";
import { jobAlertController } from "../../controllers/JobAlertController.js";
import { optionalAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/", optionalAuth, (req, res) => jobAlertController.getAlerts(req, res));
router.post("/", optionalAuth, (req, res) => jobAlertController.createAlert(req, res));
router.delete("/:id", (req, res) => jobAlertController.deleteAlert(req, res));

export default router;
