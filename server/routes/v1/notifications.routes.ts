import { Router } from "express";
import { notificationController } from "../../controllers/NotificationController.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/", optionalAuth, (req, res) => notificationController.getNotifications(req, res));
router.patch("/:id/read", optionalAuth, (req, res) => notificationController.markAsRead(req, res));
router.post("/clear", optionalAuth, (req, res) => notificationController.clearAll(req, res));

export default router;
