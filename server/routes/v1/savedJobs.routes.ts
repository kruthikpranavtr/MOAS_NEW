import { Router } from "express";
import { savedJobController } from "../../controllers/SavedJobController.js";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

router.get("/", requireAuth, (req, res) => savedJobController.getSavedJobs(req, res));
router.post("/", requireAuth, validateBody(["jobId"]), (req, res) =>
  savedJobController.toggleSavedJob(req, res)
);

export default router;
