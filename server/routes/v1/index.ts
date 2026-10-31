import { Router } from "express";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import jobsRoutes from "./jobs.routes.js";
import applicationsRoutes from "./applications.routes.js";
import companiesRoutes from "./companies.routes.js";
import resumesRoutes from "./resumes.routes.js";
import savedJobsRoutes from "./savedJobs.routes.js";
import jobAlertsRoutes from "./jobAlerts.routes.js";
import profileViewsRoutes from "./profileViews.routes.js";
import otpRoutes from "./otp.routes.js";
import aiRoutes from "./ai.routes.js";
import databaseRoutes from "./database.routes.js";
import messagingRoutes from "./messaging.routes.js";
import notificationsRoutes from "./notifications.routes.js";
import adminRoutes from "./admin.routes.js";
import employerRoutes from "./employer.routes.js";

const v1Router = Router();

v1Router.use("/auth", authRoutes);
v1Router.use("/users", usersRoutes);
v1Router.use("/jobs", jobsRoutes);
v1Router.use("/applications", applicationsRoutes);
v1Router.use("/companies", companiesRoutes);
v1Router.use("/resumes", resumesRoutes);
v1Router.use("/saved-jobs", savedJobsRoutes);
v1Router.use("/alerts", jobAlertsRoutes);
v1Router.use("/profile-views", profileViewsRoutes);
v1Router.use("/otp", otpRoutes);
v1Router.use("/ai", aiRoutes);
v1Router.use("/db", databaseRoutes);
v1Router.use("/messages", messagingRoutes);
v1Router.use("/notifications", notificationsRoutes);
v1Router.use("/admin", adminRoutes);
v1Router.use("/employer", employerRoutes);

export default v1Router;

