import { Router } from "express";
import multer from "multer";
import { resumeController } from "../../controllers/ResumeController.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

// Configure multer memory storage with 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
});

// List resumes for authenticated candidate (or target candidate if admin)
router.get("/", requireAuth, (req, res) =>
  resumeController.listResumes(req, res)
);

const resumeUploadMiddleware = (req: any, res: any, next: any) => {
  upload.any()(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "File exceeds maximum size limit of 5MB." });
      }
      return next(err);
    }
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files.find((f: any) => f.fieldname === "resumeFile" || f.fieldname === "resume" || f.fieldname === "file") || req.files[0];
    }
    next();
  });
};

// Upload resume file (PDF or DOCX <= 5MB)
router.post(
  "/upload",
  requireAuth,
  resumeUploadMiddleware,
  (req, res) => resumeController.uploadResumeFile(req, res)
);

// Download resume document with authorized file streaming
router.get("/:id/download", requireAuth, (req, res) =>
  resumeController.downloadResume(req, res)
);

// Set primary active resume
router.patch("/:id/primary", requireAuth, (req, res) =>
  resumeController.setPrimary(req, res)
);

// Delete resume document and remove from storage
router.delete("/:id", requireAuth, (req, res) =>
  resumeController.deleteResume(req, res)
);

// Analyze resume content and match against algorithmic job requirements
router.post("/:id/analyze", requireAuth, (req, res) =>
  resumeController.analyzeResume(req, res)
);

// Get single resume metadata by ID
router.get("/:id", requireAuth, (req, res) =>
  resumeController.getResumeById(req, res)
);

export default router;
