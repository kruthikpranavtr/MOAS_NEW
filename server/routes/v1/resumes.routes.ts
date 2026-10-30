import { Router } from "express";
import { resumeController } from "../../controllers/ResumeController.js";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

router.post("/upload", requireAuth, validateBody(["resume"]), (req, res) =>
  resumeController.uploadResume(req, res)
);

export default router;
