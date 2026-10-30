import { Router } from "express";
import { savedJobController } from "../../controllers/SavedJobController.js";
import { requireAuth, optionalAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

router.get("/", optionalAuth, (req, res) => savedJobController.getSavedJobs(req, res));
router.post("/", requireAuth, validateBody(["jobId"]), (req, res) =>
  savedJobController.toggleSavedJob(req, res)
);

export default router;
