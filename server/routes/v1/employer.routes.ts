import { Router } from "express";
import { employerController } from "../../controllers/EmployerController.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

// All employer routes require authentication and Employer or Admin role
router.use(requireAuth);
router.use(requireRole(["Employer", "employer", "Admin"]));

// Dashboard metrics & hiring activity
router.get("/dashboard", (req, res) => employerController.getDashboard(req, res));

// Employer Profile Management
router.get("/profile", (req, res) => employerController.getProfile(req, res));
router.put("/profile", (req, res) => employerController.updateProfile(req, res));
router.patch("/profile", (req, res) => employerController.updateProfile(req, res));

// Employer Job Management
router.get("/jobs", (req, res) => employerController.getJobs(req, res));
router.patch("/jobs/:id/status", validateBody(["status"]), (req, res) =>
  employerController.updateJobStatus(req, res)
);

// Employer Applicant Management
router.get("/applicants", (req, res) => employerController.getApplicants(req, res));
router.patch("/applications/:id/stage", (req, res) =>
  employerController.updateApplicationStage(req, res)
);
router.put("/applications/:id/stage", (req, res) =>
  employerController.updateApplicationStage(req, res)
);
router.patch("/applications/:id/notes", (req, res) =>
  employerController.addRecruiterNotes(req, res)
);
router.put("/applications/:id/notes", (req, res) =>
  employerController.addRecruiterNotes(req, res)
);
router.post("/applications/:id/schedule-interview", (req, res) =>
  employerController.scheduleInterview(req, res)
);

export default router;
