import { Router } from "express";
import multer from "multer";
import { userController } from "../../controllers/UserController.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { authRateLimiter } from "../../middleware/rateLimiter.js";
import { validateBody } from "../../middleware/validator.js";

const router = Router();

const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
    files: 1,
  },
});

router.get("/", (req, res) => userController.getAllUsers(req, res));

const photoUploadMiddleware = (req: any, res: any, next: any) => {
  uploadPhoto.any()(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "Image exceeds maximum size limit of 2MB." });
      }
      return next(err);
    }
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files.find((f: any) => f.fieldname === "photo" || f.fieldname === "avatar" || f.fieldname === "image") || req.files[0];
    }
    next();
  });
};

// Profile photo upload & removal
router.post(
  "/photo",
  requireAuth,
  photoUploadMiddleware,
  (req, res) => userController.updatePhoto(req, res)
);

router.delete("/photo", requireAuth, (req, res) =>
  userController.removePhoto(req, res)
);

// Serve profile photo safely with cache headers
router.get("/:id/photo", (req, res) => userController.getPhoto(req, res));

// Candidate structured profile endpoints
router.get("/:id/candidate-profile", requireAuth, (req, res) =>
  userController.getCandidateProfile(req, res)
);

router.put("/:id/candidate-profile", requireAuth, (req, res) =>
  userController.updateCandidateProfile(req, res)
);

// Profile completeness calculation
router.get("/:id/completeness", requireAuth, (req, res) =>
  userController.getCompleteness(req, res)
);

router.get("/:id", (req, res) => userController.getUserById(req, res));

router.post(
  "/",
  authRateLimiter,
  validateBody(["name", "email", "role"]),
  (req, res) => userController.registerUser(req, res)
);

router.put("/:id", requireAuth, (req, res) => userController.updateProfile(req, res));

router.patch("/:id/role", requireAuth, requireAdmin, validateBody(["role"]), (req, res) =>
  userController.updateUserRole(req, res)
);

// Legacy photo update route
router.post("/update-photo", requireAuth, uploadPhoto.single("photo"), (req, res) =>
  userController.updatePhoto(req, res)
);

export default router;
