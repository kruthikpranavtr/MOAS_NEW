import { Router } from "express";
import { messagingController } from "../../controllers/MessagingController.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/conversations", requireAuth, (req, res) => messagingController.getConversations(req, res));
router.post("/conversations", requireAuth, (req, res) => messagingController.createConversation(req, res));
router.get("/conversations/unread-count", requireAuth, (req, res) => messagingController.getUnreadCount(req, res));
router.get("/conversations/:id", requireAuth, (req, res) => messagingController.getConversationById(req, res));
router.get("/conversations/:id/messages", requireAuth, (req, res) => messagingController.getMessages(req, res));
router.post("/conversations/:id/messages", requireAuth, (req, res) => messagingController.sendMessage(req, res));
router.patch("/conversations/:id/read", requireAuth, (req, res) => messagingController.markAsRead(req, res));
router.post("/conversations/:id/typing", requireAuth, (req, res) => messagingController.sendTyping(req, res));
router.post("/send", requireAuth, (req, res) => messagingController.sendMessage(req, res));

export default router;
