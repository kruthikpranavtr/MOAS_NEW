import { Router } from "express";
import { aiController } from "../../controllers/AIController.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

router.post("/analyze-resume", (req, res) => aiController.analyzeResume(req, res));
router.post("/generate-job", (req, res) => aiController.generateJob(req, res));
router.post("/smart-reply", (req, res) => aiController.smartReply(req, res));
router.post("/chat", validateBody(["message"]), (req, res) => aiController.chat(req, res));
router.post("/translate", validateBody(["text", "targetLanguage"]), (req, res) =>
  aiController.translate(req, res)
);
router.post("/match-score", (req, res) => aiController.matchScore(req, res));
router.post("/rag-search", validateBody(["query"]), (req, res) => aiController.ragSearch(req, res));
router.post("/rag-job-match", validateBody(["job", "candidate"]), (req, res) =>
  aiController.ragJobMatch(req, res)
);
router.post("/agent-run", validateBody(["goal"]), (req, res) => aiController.runCareerAgent(req, res));

export default router;
