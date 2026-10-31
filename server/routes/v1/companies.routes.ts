import { Router } from "express";
import multer from "multer";
import { companyController } from "../../controllers/CompanyController.js";
import { validateBody } from "../../middleware/validator.js";
import { requireAuth, requireRole, requireAdmin } from "../../middleware/auth.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
  },
});

const logoUploadMiddleware = (req: any, res: any, next: any) => {
  upload.any()(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "File exceeds maximum size limit of 2MB." });
      }
      return next(err);
    }
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files.find((f: any) => f.fieldname === "logo" || f.fieldname === "file") || req.files[0];
    }
    next();
  });
};

// 1. Directory and Search
router.get("/", (req, res) => companyController.getCompanies(req, res));
router.get("/top", (req, res) => companyController.getTopCompanies(req, res));

// 2. Reviews and Ratings
router.get("/ratings", (req, res) => companyController.getRatings(req, res));
router.post("/ratings", requireAuth, validateBody(["companyId", "rating"]), (req, res) =>
  companyController.postRating(req, res)
);
router.delete("/ratings/:id", requireAuth, requireAdmin, (req, res) =>
  companyController.deleteRating(req, res)
);

// 3. Recruiter Invitation Acceptance (before /:id routes)
router.post("/invitations/accept", requireAuth, validateBody(["token"]), (req, res) =>
  companyController.acceptInvitation(req, res)
);

// 4. Company Creation
router.post(
  "/",
  requireAuth,
  requireRole(["Employer", "employer", "Admin"]),
  validateBody(["name"]),
  (req, res) => companyController.createCompany(req, res)
);

// 5. Single Company Operations
router.get("/:id", (req, res) => companyController.getCompanyById(req, res));
router.put("/:id", requireAuth, (req, res) => companyController.updateCompany(req, res));
router.patch("/:id", requireAuth, (req, res) => companyController.updateCompany(req, res));
router.delete("/:id", requireAuth, (req, res) => companyController.archiveCompany(req, res));

// 6. Logo Branding
router.post("/:id/logo", requireAuth, logoUploadMiddleware, (req, res) =>
  companyController.uploadLogo(req, res)
);
router.get("/:id/logo", (req, res) => companyController.getLogo(req, res));
router.delete("/:id/logo", requireAuth, (req, res) => companyController.deleteLogo(req, res));

// 7. Team & Recruiter Management
router.get("/:id/members", requireAuth, (req, res) => companyController.getMembers(req, res));
router.post("/:id/invitations", requireAuth, validateBody(["email"]), (req, res) =>
  companyController.inviteRecruiter(req, res)
);
router.put("/:id/members/:userId", requireAuth, validateBody(["role"]), (req, res) =>
  companyController.updateMemberRole(req, res)
);
router.patch("/:id/members/:userId", requireAuth, validateBody(["role"]), (req, res) =>
  companyController.updateMemberRole(req, res)
);
router.patch("/:id/members/:userId/role", requireAuth, validateBody(["role"]), (req, res) =>
  companyController.updateMemberRole(req, res)
);
router.delete("/:id/members/:userId", requireAuth, (req, res) =>
  companyController.removeMember(req, res)
);
router.post("/:id/transfer-ownership", requireAuth, (req, res) =>
  companyController.transferOwnership(req, res)
);

// 8. Admin Verification
router.patch("/:id/verify", requireAuth, requireAdmin, (req, res) =>
  companyController.verifyCompany(req, res)
);

export default router;
