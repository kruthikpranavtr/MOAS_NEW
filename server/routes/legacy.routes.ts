import { Router } from "express";
import { authController } from "../controllers/AuthController.js";
import { userController } from "../controllers/UserController.js";
import { jobController } from "../controllers/JobController.js";
import { applicationController } from "../controllers/ApplicationController.js";
import { companyController } from "../controllers/CompanyController.js";
import { resumeController } from "../controllers/ResumeController.js";
import { savedJobController } from "../controllers/SavedJobController.js";
import { jobAlertController } from "../controllers/JobAlertController.js";
import { profileViewController } from "../controllers/ProfileViewController.js";
import { otpController } from "../controllers/OtpController.js";
import { aiController } from "../controllers/AIController.js";
import { databaseAdminController } from "../controllers/DatabaseAdminController.js";
import { requireAuth, requireRole, optionalAuth } from "../middleware/auth.js";
import { authRateLimiter, otpRateLimiter } from "../middleware/rateLimiter.js";

const legacyRouter = Router();

// ==========================================
// 1. AUTHENTICATION (Legacy /api/auth/*)
// ==========================================
legacyRouter.post("/auth/register", authRateLimiter, (req, res) => authController.register(req, res));
legacyRouter.post("/auth/login", authRateLimiter, (req, res) => authController.login(req, res));
legacyRouter.post("/auth/logout", (req, res) => authController.logout(req, res));
legacyRouter.get("/auth/me", requireAuth, (req, res) => authController.getMe(req, res));
legacyRouter.post("/auth/password/forgot", authRateLimiter, (req, res) => authController.forgotPassword(req, res));
legacyRouter.get("/auth/password/verify-token", (req, res) => authController.verifyResetToken(req, res));
legacyRouter.post("/auth/password/reset", authRateLimiter, (req, res) => authController.resetPassword(req, res));
legacyRouter.post("/auth/email/send-verification", requireAuth, (req, res) => authController.sendEmailVerification(req, res));
legacyRouter.post("/auth/email/verify", (req, res) => authController.verifyEmail(req, res));


// ==========================================
// 2. JOBS (Legacy /api/jobs/*)
// ==========================================
legacyRouter.get("/jobs", (req, res) => jobController.getAllJobs(req, res));
legacyRouter.get("/jobs/:id", (req, res) => jobController.getJobById(req, res));
legacyRouter.post("/jobs", requireAuth, requireRole(["Employer", "employer", "Admin"]), (req, res) =>
  jobController.createJob(req, res)
);
legacyRouter.delete("/jobs/:id", requireAuth, requireRole(["Employer", "employer", "Admin"]), (req, res) =>
  jobController.deleteJob(req, res)
);

// ==========================================
// 3. APPLICATIONS (Legacy /api/applications/*)
// ==========================================
legacyRouter.get("/applications", (req, res) => applicationController.getApplications(req, res));
legacyRouter.post("/applications", requireAuth, (req, res) => applicationController.submitApplication(req, res));
legacyRouter.patch(
  "/applications/:id",
  requireAuth,
  requireRole(["Employer", "employer", "Admin"]),
  (req, res) => applicationController.updateStatus(req, res)
);
legacyRouter.delete("/applications/:id", requireAuth, (req, res) =>
  applicationController.deleteApplication(req, res)
);

// ==========================================
// 4. COMPANIES & RATINGS (Legacy /api/companies, /api/moas/companies, /api/moas/ratings)
// ==========================================
legacyRouter.get("/companies", (req, res) => companyController.getCompanies(req, res));
legacyRouter.get("/moas/companies", (req, res) => companyController.getCompanies(req, res));
legacyRouter.get("/moas/top-companies", (req, res) => companyController.getTopCompanies(req, res));
legacyRouter.get("/moas/ratings", (req, res) => companyController.getRatings(req, res));
legacyRouter.post("/moas/ratings", (req, res) => companyController.postRating(req, res));

// ==========================================
// 5. SAVED JOBS (Legacy /api/saved-jobs)
// ==========================================
legacyRouter.get("/saved-jobs", optionalAuth, (req, res) => savedJobController.getSavedJobs(req, res));
legacyRouter.post("/saved-jobs", requireAuth, (req, res) => savedJobController.toggleSavedJob(req, res));

// ==========================================
// 6. JOB ALERTS (Legacy /api/alerts)
// ==========================================
legacyRouter.get("/alerts", optionalAuth, (req, res) => jobAlertController.getAlerts(req, res));
legacyRouter.post("/alerts", optionalAuth, (req, res) => jobAlertController.createAlert(req, res));
legacyRouter.delete("/alerts/:id", (req, res) => jobAlertController.deleteAlert(req, res));

// ==========================================
// 7. PROFILE VIEWS (Legacy /api/moas/profile-views/*)
// ==========================================
legacyRouter.get("/moas/profile-views", (req, res) => profileViewController.getViews(req, res));
legacyRouter.post("/moas/profile-views/record", (req, res) => profileViewController.recordView(req, res));
legacyRouter.post("/moas/profile-views/reset", (req, res) => profileViewController.resetViews(req, res));

// ==========================================
// 8. USERS & PROFILES (Legacy /api/moas/users/*)
// ==========================================
legacyRouter.get("/moas/users", (req, res) => userController.getAllUsers(req, res));
legacyRouter.get("/moas/users/:id", (req, res) => userController.getUserById(req, res));
legacyRouter.put("/moas/users/:id", requireAuth, (req, res) => userController.updateProfile(req, res));
legacyRouter.post("/moas/users", authRateLimiter, (req, res) => userController.registerUser(req, res));
legacyRouter.post("/moas/upload-resume", requireAuth, (req, res) => resumeController.uploadResume(req, res));
legacyRouter.post("/moas/update-photo", requireAuth, (req, res) => userController.updatePhoto(req, res));

// ==========================================
// 9. AI SERVICES (Legacy /api/moas/ai-*, rag-*, agent-run)
// ==========================================
legacyRouter.post("/moas/ai-analyze-resume", (req, res) => aiController.analyzeResume(req, res));
legacyRouter.post("/moas/ai-generate-job", (req, res) => aiController.generateJob(req, res));
legacyRouter.post("/moas/ai-smart-reply", (req, res) => aiController.smartReply(req, res));
legacyRouter.post("/moas/ai-chat", (req, res) => aiController.chat(req, res));
legacyRouter.post("/moas/translate", (req, res) => aiController.translate(req, res));
legacyRouter.post("/moas/ai-match-score", (req, res) => aiController.matchScore(req, res));
legacyRouter.post("/moas/rag-search", (req, res) => aiController.ragSearch(req, res));
legacyRouter.post("/moas/rag-job-match", (req, res) => aiController.ragJobMatch(req, res));
legacyRouter.post("/moas/agent-run", (req, res) => aiController.runCareerAgent(req, res));

// ==========================================
// 10. OTP (Legacy /api/otp/*)
// ==========================================
legacyRouter.post("/otp/send", otpRateLimiter, (req, res) => otpController.sendOtp(req, res));
legacyRouter.post("/otp/verify", otpRateLimiter, (req, res) => otpController.verifyOtp(req, res));

// ==========================================
// 11. DATABASE ADMIN (Legacy /api/db/*)
// ==========================================
legacyRouter.get("/db/status", (req, res) => databaseAdminController.getStatus(req, res));
legacyRouter.get("/db/postgres/status", (req, res) => databaseAdminController.getPostgresStatus(req, res));
legacyRouter.get(
  "/db/postgres/tables/:table",
  requireAuth,
  requireRole(["Admin"]),
  (req, res) => databaseAdminController.getTableRows(req, res)
);
legacyRouter.post(
  "/db/seed",
  requireAuth,
  requireRole(["Admin"]),
  (req, res) => databaseAdminController.seedData(req, res)
);

export default legacyRouter;
