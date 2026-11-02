import { Router } from "express";
import { notificationController } from "../../controllers/NotificationController.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (req, res) => notificationController.getNotifications(req, res));
router.get("/unread-count", requireAuth, (req, res) => notificationController.getUnreadCount(req, res));
router.patch("/read-all", requireAuth, (req, res) => notificationController.markAllAsRead(req, res));
router.patch("/:id/read", requireAuth, (req, res) => notificationController.markAsRead(req, res));
router.patch("/:id/archive", requireAuth, (req, res) => notificationController.archive(req, res));
router.delete("/:id", requireAuth, (req, res) => notificationController.deleteNotification(req, res));
router.post("/clear", requireAuth, (req, res) => notificationController.clearAll(req, res));

export default router;
