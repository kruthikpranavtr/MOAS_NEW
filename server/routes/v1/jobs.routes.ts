import { Router } from "express";
import { jobController } from "../../controllers/JobController.js";
import { applicationController } from "../../controllers/ApplicationController.js";
import { savedJobController } from "../../controllers/SavedJobController.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

// Public Job Discovery & Search
router.get("/", (req, res) => jobController.getAllJobs(req, res));
router.get("/categories", (req, res) => jobController.getCategoryCounts(req, res));

// Saved Jobs (Candidate Bookmarks)
router.get("/saved", requireAuth, (req, res) => savedJobController.getSavedJobs(req, res));
router.post("/saved", requireAuth, (req, res) => savedJobController.toggleSavedJob(req, res));
router.delete("/saved/:id", requireAuth, (req, res) => savedJobController.removeSavedJob(req, res));

// Single Job Details
router.get("/:id", (req, res) => jobController.getJobById(req, res));

// Employer Job Creation (Task 2 & 13)
router.post(
  "/",
  requireAuth,
  requireRole(["Employer", "employer", "Admin"]),
  validateBody(["title"]),
  (req, res) => jobController.createJob(req, res)
);

// Candidate Application Submission
router.post("/:id/apply", requireAuth, (req, res) => {
  req.body.jobId = req.params.id;
  return applicationController.submitApplication(req, res);
});

// Employer Job Updates
router.put(
  "/:id",
  requireAuth,
  requireRole(["Employer", "employer", "Admin"]),
  (req, res) => jobController.updateJob(req, res)
);

router.patch(
  "/:id",
  requireAuth,
  requireRole(["Employer", "employer", "Admin"]),
  (req, res) => jobController.updateJob(req, res)
);

// Job Status Transition (Task 3: Publish, Close, Reopen, Archive)
router.patch(
  "/:id/status",
  requireAuth,
  requireRole(["Employer", "employer", "Admin"]),
  (req, res) => jobController.updateJobStatus(req, res)
);

// Job Deletion
router.delete(
  "/:id",
  requireAuth,
  requireRole(["Employer", "employer", "Admin"]),
  (req, res) => jobController.deleteJob(req, res)
);

export default router;
