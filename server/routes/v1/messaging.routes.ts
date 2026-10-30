import { Router } from "express";
import { messagingController } from "../../controllers/MessagingController.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

router.get("/conversations", optionalAuth, (req, res) => messagingController.getConversations(req, res));
router.get("/conversations/:id", (req, res) => messagingController.getConversationById(req, res));
router.post(
  "/conversations/:id/messages",
  optionalAuth,
  validateBody(["text"]),
  (req, res) => {
    req.body.conversationId = req.params.id;
    return messagingController.sendMessage(req, res);
  }
);
router.post(
  "/send",
  optionalAuth,
  validateBody(["conversationId", "text"]),
  (req, res) => messagingController.sendMessage(req, res)
);

export default router;
