import { Router } from "express";
import { applicationController } from "../../controllers/ApplicationController.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

router.get("/", requireAuth, (req, res) => applicationController.getApplications(req, res));
router.get("/:id", requireAuth, (req, res) => applicationController.getApplicationById(req, res));
router.get("/:id/history", requireAuth, (req, res) => applicationController.getApplicationHistory(req, res));

router.post("/", requireAuth, validateBody(["jobId"]), (req, res) =>
  applicationController.submitApplication(req, res)
);

router.post("/:id/withdraw", requireAuth, (req, res) =>
  applicationController.withdrawApplication(req, res)
);

router.patch(
  "/:id",
  requireAuth,
  requireRole(["Employer", "employer", "Admin"]),
  validateBody(["status"]),
  (req, res) => applicationController.updateStatus(req, res)
);

router.delete("/:id", requireAuth, (req, res) => applicationController.deleteApplication(req, res));

export default router;
