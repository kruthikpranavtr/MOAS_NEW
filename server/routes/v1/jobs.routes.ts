import { Router } from "express";
import { jobController } from "../../controllers/JobController.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

router.get("/", (req, res) => jobController.getAllJobs(req, res));
router.get("/:id", (req, res) => jobController.getJobById(req, res));
router.post(
  "/",
  requireAuth,
  requireRole(["Employer", "employer", "Admin"]),
  validateBody(["title", "company", "description"]),
  (req, res) => jobController.createJob(req, res)
);
router.delete(
  "/:id",
  requireAuth,
  requireRole(["Employer", "employer", "Admin"]),
  (req, res) => jobController.deleteJob(req, res)
);

export default router;
