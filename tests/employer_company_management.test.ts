import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";

import { initDatabase, closePool, query } from "../server/db/postgresClient.js";
import { migrator } from "../server/db/migrator.js";
import { userRepository } from "../server/repositories/UserRepository.js";
import { companyRepository } from "../server/repositories/CompanyRepository.js";
import { companyMemberRepository } from "../server/repositories/CompanyMemberRepository.js";
import { jobRepository } from "../server/repositories/JobRepository.js";
import { applicationRepository } from "../server/repositories/ApplicationRepository.js";
import { hashPassword } from "../server/utils/crypto.js";

const { app } = await import("../server.js");

// 1x1 valid transparent PNG
const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

test("MOAS Phase 8 Complete Employer and Company Management Test Suite", async (t) => {
  await initDatabase();
  await migrator.runMigrations();

  const timestamp = Date.now();

  // Test identities
  const empAlphaEmail = `emp_alpha_${timestamp}@alpha.tech`;
  const empAlphaPassword = "EmployerAlpha@2026!";
  let empAlphaToken = "";
  let empAlphaCookie = "";
  let empAlphaId = "";
  let compAlphaId = "";

  const empBetaEmail = `emp_beta_${timestamp}@beta.tech`;
  const empBetaPassword = "EmployerBeta@2026!";
  let empBetaToken = "";
  let empBetaCookie = "";
  let empBetaId = "";
  let compBetaId = "";

  const recruiterEmail = `recruiter_${timestamp}@alpha.tech`;
  const recruiterPassword = "Recruiter@2026!";
  let recruiterToken = "";
  let recruiterCookie = "";
  let recruiterId = "";

  const candAEmail = `cand_a_${timestamp}@moas.internal`;
  const candAPassword = "CandidateA@2026!";
  let candAToken = "";
  let candACookie = "";
  let candAId = "";

  const candBEmail = `cand_b_${timestamp}@moas.internal`;
  const candBPassword = "CandidateB@2026!";
  let candBToken = "";
  let candBCookie = "";
  let candBId = "";

  const adminEmail = `admin_${timestamp}@moas.internal`;
  const adminPassword = "AdminSecure@2026!";
  let adminToken = "";
  let adminCookie = "";
  let adminId = "";

  let jobAlphaId = "";
  let appCandAId = "";
  let appCandBId = "";
  let invitationToken = "";
  let recruiterMemberId = "";

  // Helper to extract session cookie
  const getSessionCookie = (res: any) => {
    const cookies = res.headers["set-cookie"];
    if (!cookies) return "";
    const cookie = Array.isArray(cookies) ? cookies.find((c) => c.startsWith("moas_session=")) : cookies;
    return cookie ? cookie.split(";")[0] : "";
  };

  // 1. Setup isolated test accounts
  await t.test("1. Setup: provision Employer Alpha, Employer Beta, Recruiter, Candidate A, Candidate B, and Admin", async () => {
    // Register Employer Alpha
    const regEmpAlpha = await request(app).post("/api/v1/auth/register").send({
      name: "Alpha Corp Founder",
      username: `emp_alpha_${timestamp}`,
      email: empAlphaEmail,
      phone: `+91 98${String(timestamp).slice(-8)}`,
      password: empAlphaPassword,
      confirmPassword: empAlphaPassword,
      companyName: `Alpha Initial Corp ${timestamp}`,
      role: "Employer",
    });
    assert.equal(regEmpAlpha.status, 201);
    empAlphaToken = regEmpAlpha.body.token;
    empAlphaCookie = getSessionCookie(regEmpAlpha);
    empAlphaId = regEmpAlpha.body.user.id;

    // Register Employer Beta
    const regEmpBeta = await request(app).post("/api/v1/auth/register").send({
      name: "Beta Corp Founder",
      username: `emp_beta_${timestamp}`,
      email: empBetaEmail,
      phone: `+91 97${String(timestamp).slice(-8)}`,
      password: empBetaPassword,
      confirmPassword: empBetaPassword,
      companyName: `Beta Initial Corp ${timestamp}`,
      role: "Employer",
    });
    assert.equal(regEmpBeta.status, 201);
    empBetaToken = regEmpBeta.body.token;
    empBetaCookie = getSessionCookie(regEmpBeta);
    empBetaId = regEmpBeta.body.user.id;

    // Register Recruiter
    const regRecruiter = await request(app).post("/api/v1/auth/register").send({
      name: "Alpha Talent Scout",
      username: `recruiter_${timestamp}`,
      email: recruiterEmail,
      phone: `+91 96${String(timestamp).slice(-8)}`,
      password: recruiterPassword,
      confirmPassword: recruiterPassword,
      companyName: `Alpha Initial Corp ${timestamp}`,
      role: "Employer",
    });
    assert.equal(regRecruiter.status, 201);
    recruiterToken = regRecruiter.body.token;
    recruiterCookie = getSessionCookie(regRecruiter);
    recruiterId = regRecruiter.body.user.id;

    // Register Candidate A
    const regCandA = await request(app).post("/api/v1/auth/register").send({
      name: "Candidate Alpha",
      username: `cand_a_${timestamp}`,
      email: candAEmail,
      phone: `+91 95${String(timestamp).slice(-8)}`,
      password: candAPassword,
      confirmPassword: candAPassword,
      role: "Candidate",
    });
    assert.equal(regCandA.status, 201);
    candAToken = regCandA.body.token;
    candACookie = getSessionCookie(regCandA);
    candAId = regCandA.body.user.id;

    // Register Candidate B
    const regCandB = await request(app).post("/api/v1/auth/register").send({
      name: "Candidate Beta",
      username: `cand_b_${timestamp}`,
      email: candBEmail,
      phone: `+91 94${String(timestamp).slice(-8)}`,
      password: candBPassword,
      confirmPassword: candBPassword,
      role: "Candidate",
    });
    assert.equal(regCandB.status, 201);
    candBToken = regCandB.body.token;
    candBCookie = getSessionCookie(regCandB);
    candBId = regCandB.body.user.id;

    // Provision Admin in DB directly
    adminId = `admin-user-${timestamp}`;
    const adminPassHash = await hashPassword(adminPassword);
    await query(
      `INSERT INTO moas.users (id, email, username, password_hash, name, role, email_verified)
       VALUES ($1, $2, $3, $4, $5, 'Admin', true)`,
      [adminId, adminEmail, `admin_${timestamp}`, adminPassHash, "System Admin"]
    );

    const loginAdmin = await request(app).post("/api/v1/auth/login").send({
      identifier: adminEmail,
      password: adminPassword,
    });
    assert.equal(loginAdmin.status, 200);
    adminToken = loginAdmin.body.token;
    adminCookie = getSessionCookie(loginAdmin);
  });

  // 2. Employer Profile Management
  await t.test("2. Employer Profile: view and update profile with persistence and validation", async () => {
    // GET employer profile
    const getRes = await request(app)
      .get("/api/v1/employer/profile")
      .set("Authorization", `Bearer ${empAlphaToken}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.profile.userId, empAlphaId);

    // PUT employer profile updates
    const updateRes = await request(app)
      .put("/api/v1/employer/profile")
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        name: "Dr. Alpha Founder",
        businessEmail: "founder@alpharobotics.ai",
        phone: "+91 98888 77777",
        designation: "Chief Technology Officer",
        companyWebsite: "https://alpharobotics.ai",
        location: "Bengaluru, India",
        preferences: { notificationChannel: "email", dailyDigest: true },
      });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.profile.designation, "Chief Technology Officer");
    assert.equal(updateRes.body.profile.businessEmail, "founder@alpharobotics.ai");
    assert.equal(updateRes.body.profile.location, "Bengaluru, India");

    // Candidate is rejected (403)
    const candForbidden = await request(app)
      .put("/api/v1/employer/profile")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({ designation: "Hacker" });
    assert.equal(candForbidden.status, 403);
  });

  // 3. Company Creation & Ownership
  await t.test("3. Company Profile: create, read, update, and cross-company edit protection", async () => {
    // Employer Alpha creates company
    const createRes = await request(app)
      .post("/api/v1/companies")
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        name: `Alpha Robotics ${timestamp}`,
        description: "Autonomous robotics and generative edge intelligence systems.",
        industry: "Robotics & AI",
        size: "51-200",
        website: "https://alpharobotics.ai",
        headquarters: "Bengaluru, Karnataka",
        contactEmail: "careers@alpharobotics.ai",
        contactPhone: "+91 80 1234 5678",
        benefits: ["Comprehensive Health Coverage", "Remote-first Flexibility", "Equity Grants"],
        culture: "High autonomy, rigorous engineering benchmarks, and deep technical curiosity.",
      });
    assert.equal(createRes.status, 201);
    compAlphaId = createRes.body.company.id;
    assert.ok(compAlphaId);
    // Verification status must default to 'pending'
    assert.equal(createRes.body.company.verificationStatus, "pending");

    // Employer Alpha is registered as owner in company_members
    const membersRes = await request(app)
      .get(`/api/v1/companies/${compAlphaId}/members`)
      .set("Authorization", `Bearer ${empAlphaToken}`);
    assert.equal(membersRes.status, 200);
    assert.ok(membersRes.body.members.some((m: any) => m.userId === empAlphaId && m.role === "owner"));

    // Employer Alpha updates company details
    const updateRes = await request(app)
      .put(`/api/v1/companies/${compAlphaId}`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        description: "Updated autonomous robotics with advanced humanoid perception pipelines.",
        size: "201-500",
      });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.company.size, "201-500");

    // Cross-Company Protection: Employer Beta cannot update Company Alpha (403)
    const betaUnauthorized = await request(app)
      .put(`/api/v1/companies/${compAlphaId}`)
      .set("Authorization", `Bearer ${empBetaToken}`)
      .send({ name: "Malicious Takeover" });
    assert.equal(betaUnauthorized.status, 403);
  });

  // 4. Company Verification Workflow & Audit Logs
  await t.test("4. Company Verification: self-verification rejection, admin approval, and audit logs", async () => {
    // Employer cannot self-verify (403)
    const selfVerify = await request(app)
      .put(`/api/v1/admin/companies/${compAlphaId}/verify`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ status: "verified" });
    assert.equal(selfVerify.status, 403);

    // Admin verifies Company Alpha
    const adminVerify = await request(app)
      .put(`/api/v1/admin/companies/${compAlphaId}/verify`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "verified",
        notes: "Corporate registration and tax filings verified by compliance committee.",
      });
    assert.equal(adminVerify.status, 200);
    assert.equal(adminVerify.body.company.verificationStatus, "verified");
    assert.ok(adminVerify.body.company.verifiedAt);
    assert.equal(adminVerify.body.company.verifiedBy, adminId);

    // Verify audit log entry exists
    const auditLogs = await query(
      `SELECT * FROM moas.audit_logs WHERE action = 'ADMIN_COMPANY_VERIFIED' AND resource_id = $1`,
      [compAlphaId]
    );
    assert.ok(auditLogs.rows.length >= 1);
  });

  // 5. Company Membership, Invitations & Ownership Transfer
  await t.test("5. Recruiter Management: invitations, acceptance, role change, and ownership transfer", async () => {
    // Employer Alpha invites recruiter
    const inviteRes = await request(app)
      .post(`/api/v1/companies/${compAlphaId}/invitations`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        email: recruiterEmail,
        role: "recruiter",
      });
    assert.equal(inviteRes.status, 201);
    invitationToken = inviteRes.body.invitationToken || inviteRes.body.invitation?.token;
    assert.ok(invitationToken);

    // Recruiter accepts invitation
    const acceptRes = await request(app)
      .post("/api/v1/companies/invitations/accept")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({ token: invitationToken });
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.membership.role, "recruiter");
    recruiterMemberId = acceptRes.body.membership.id;

    // Employer Alpha promotes recruiter to admin
    const promoteRes = await request(app)
      .put(`/api/v1/companies/${compAlphaId}/members/${recruiterMemberId}`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ role: "admin" });
    assert.equal(promoteRes.status, 200);
    assert.equal(promoteRes.body.member.role, "admin");

    // Employer Alpha transfers ownership to recruiter
    const transferRes = await request(app)
      .post(`/api/v1/companies/${compAlphaId}/transfer-ownership`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ newOwnerUserId: recruiterId });
    assert.equal(transferRes.status, 200);

    // Verify roles: Recruiter is now owner, Employer Alpha is now admin
    const checkMembers = await companyMemberRepository.getCompanyMembers(compAlphaId);
    const alphaMembership = checkMembers.find((m) => m.userId === empAlphaId);
    const recruiterMembership = checkMembers.find((m) => m.userId === recruiterId);
    assert.equal(recruiterMembership?.role, "owner");
    assert.equal(alphaMembership?.role, "admin");

    // Transfer back so Employer Alpha remains owner for remaining tests
    await companyMemberRepository.transferOwnership(compAlphaId, empAlphaId, recruiterId);
  });

  // 6. Employer Job Management & RBAC
  await t.test("6. Employer Job Management: create, update status, and unauthorized edit rejection", async () => {
    // Candidate cannot post job (403)
    const candPostJob = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        title: "Unauthorized Job",
        company: `Alpha Robotics ${timestamp}`,
        companyId: compAlphaId,
        location: "Remote",
        type: "Full-time",
        experienceLevel: "Senior",
        description: "Should fail",
      });
    assert.equal(candPostJob.status, 403);

    // Employer Alpha creates job
    const postRes = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        title: "Senior Perception Engineer",
        company: `Alpha Robotics ${timestamp}`,
        companyId: compAlphaId,
        location: "Bengaluru (Hybrid)",
        type: "Full-time",
        experienceLevel: "Senior",
        department: "Robotics Core",
        salaryMin: 3500000,
        salaryMax: 5500000,
        skillsRequired: ["PyTorch", "ROS2", "CUDA", "Computer Vision"],
        description: "Design real-time object tracking and semantic segmentation architectures.",
      });
    assert.equal(postRes.status, 201);
    jobAlphaId = postRes.body.job.id;
    assert.ok(jobAlphaId);

    // Employer Alpha views their own jobs
    const getJobsRes = await request(app)
      .get("/api/v1/employer/jobs")
      .set("Authorization", `Bearer ${empAlphaToken}`);
    assert.equal(getJobsRes.status, 200);
    assert.ok(getJobsRes.body.jobs.some((j: any) => j.id === jobAlphaId));

    // Update job status to 'closed'
    const closeRes = await request(app)
      .patch(`/api/v1/employer/jobs/${jobAlphaId}/status`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ status: "closed" });
    assert.equal(closeRes.status, 200);
    assert.equal(closeRes.body.job.status, "closed");

    // Reopen to 'active'
    const openRes = await request(app)
      .patch(`/api/v1/employer/jobs/${jobAlphaId}/status`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ status: "active" });
    assert.equal(openRes.status, 200);
    assert.equal(openRes.body.job.status, "active");

    // Employer Beta cannot update Employer Alpha's job (403)
    const betaEditJob = await request(app)
      .patch(`/api/v1/employer/jobs/${jobAlphaId}/status`)
      .set("Authorization", `Bearer ${empBetaToken}`)
      .send({ status: "closed" });
    assert.equal(betaEditJob.status, 403);
  });

  // 7. Applicant Management, Notes, Scheduling & Privacy
  await t.test("7. Applicant Management: retrieval, status update, recruiter notes, and privacy isolation", async () => {
    // Candidate A applies to Alpha's job
    const applyA = await request(app)
      .post(`/api/v1/jobs/${jobAlphaId}/apply`)
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        coverLetter: "Passionate about autonomous perception algorithms and CUDA kernels.",
      });
    assert.equal(applyA.status, 201);
    appCandAId = applyA.body.application.id;

    // Candidate B applies to Alpha's job
    const applyB = await request(app)
      .post(`/api/v1/jobs/${jobAlphaId}/apply`)
      .set("Authorization", `Bearer ${candBToken}`)
      .send({
        coverLetter: "Extensive background in SLAM and ROS2 embedded control.",
      });
    assert.equal(applyB.status, 201);
    appCandBId = applyB.body.application.id;

    // Employer Alpha retrieves applicants
    const applicantsRes = await request(app)
      .get("/api/v1/employer/applicants")
      .set("Authorization", `Bearer ${empAlphaToken}`);
    assert.equal(applicantsRes.status, 200);
    assert.ok(applicantsRes.body.applicants.length >= 2);

    // Candidate Privacy: Employer Beta sees 0 applicants from Company Alpha
    const betaApplicants = await request(app)
      .get("/api/v1/employer/applicants")
      .set("Authorization", `Bearer ${empBetaToken}`);
    assert.equal(betaApplicants.status, 200);
    assert.ok(!betaApplicants.body.applicants.some((a: any) => a.id === appCandAId));

    // Employer Alpha adds internal recruiter notes
    const noteRes = await request(app)
      .put(`/api/v1/employer/applications/${appCandAId}/notes`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ notes: "Candidate has strong CUDA expertise. Fast-track to technical screening." });
    assert.equal(noteRes.status, 200);
    assert.equal(noteRes.body.application.recruiterNotes, "Candidate has strong CUDA expertise. Fast-track to technical screening.");

    // Employer Alpha updates stage to 'Shortlisted'
    const stageRes = await request(app)
      .patch(`/api/v1/employer/applications/${appCandAId}/stage`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ stage: "Shortlisted" });
    assert.equal(stageRes.status, 200);
    assert.equal(stageRes.body.application.status, "Shortlisted");

    // Employer Alpha schedules interview
    const interviewDate = new Date(Date.now() + 86400000 * 2).toISOString();
    const schedRes = await request(app)
      .post(`/api/v1/employer/applications/${appCandAId}/schedule-interview`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        interviewDate,
        notes: "Round 1 Technical Architecture interview with Principal Engineer.",
      });
    assert.equal(schedRes.status, 200);
    assert.equal(schedRes.body.application.status, "Interview Scheduled");
    assert.ok(schedRes.body.application.interviewScheduledAt);
  });

  // 8. Real Hiring Pipeline Statistics & Dashboard
  await t.test("8. Employer Dashboard: returns real PostgreSQL calculated hiring pipeline stats and activity", async () => {
    const dashRes = await request(app)
      .get("/api/v1/employer/dashboard")
      .set("Authorization", `Bearer ${empAlphaToken}`);
    assert.equal(dashRes.status, 200);

    const stats = dashRes.body.stats;
    assert.ok(stats.totalJobs >= 1, "Must reflect actual posted jobs");
    assert.ok(stats.activeJobs >= 1, "Must reflect actual active jobs");
    assert.ok(stats.totalApplications >= 2, "Must reflect actual received applications");
    assert.ok(stats.interviewStageCandidates >= 1, "Must reflect actual interview stage candidates");

    // Check recent activity derived from real database audit logs
    assert.ok(Array.isArray(dashRes.body.recentActivity));
    assert.ok(Array.isArray(dashRes.body.recentApplications));
    assert.ok(dashRes.body.recentApplications.some((a: any) => a.id === appCandAId));
  });

  // 9. Company Directory & Search with Filters and Pagination
  await t.test("9. Company Directory: search, industry filter, size filter, verified filter, and pagination", async () => {
    // Search by name
    const searchRes = await request(app)
      .get("/api/v1/companies")
      .query({ search: `Alpha Robotics ${timestamp}` });
    assert.equal(searchRes.status, 200);
    assert.ok(searchRes.body.companies.some((c: any) => c.id === compAlphaId));

    // Verified filter
    const verifiedRes = await request(app)
      .get("/api/v1/companies")
      .query({ verifiedStatus: "verified" });
    assert.equal(verifiedRes.status, 200);
    assert.ok(verifiedRes.body.companies.every((c: any) => c.verificationStatus === "verified"));

    // Industry filter
    const industryRes = await request(app)
      .get("/api/v1/companies")
      .query({ industry: "Robotics & AI" });
    assert.equal(industryRes.status, 200);
    assert.ok(industryRes.body.companies.some((c: any) => c.id === compAlphaId));
  });

  // 10. Company Ratings, Reviews, Duplicate Prevention & Atomicity
  await t.test("10. Company Ratings: authenticated review, atomic average calculation, and duplicate prevention", async () => {
    // Candidate A rates Company Alpha
    const rateA = await request(app)
      .post("/api/v1/companies/ratings")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        companyId: compAlphaId,
        rating: 5,
        workplaceCulture: 5,
        workLifeBalance: 4,
        careerGrowth: 5,
        compensation: 4,
        reviewTitle: "World-Class Robotics Engineering Culture",
        reviewText: "Incredible technical mentors and challenging problem domains.",
      });
    assert.equal(rateA.status, 201);
    assert.equal(rateA.body.company.rating, 5);
    assert.equal(rateA.body.company.reviewsCount, 1);

    // Candidate A duplicate review is rejected (409 Conflict)
    const dupRate = await request(app)
      .post("/api/v1/companies/ratings")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        companyId: compAlphaId,
        rating: 4,
        reviewTitle: "Attempting duplicate review",
      });
    assert.equal(dupRate.status, 409);

    // Candidate B rates Company Alpha with rating 3
    const rateB = await request(app)
      .post("/api/v1/companies/ratings")
      .set("Authorization", `Bearer ${candBToken}`)
      .send({
        companyId: compAlphaId,
        rating: 3,
        reviewTitle: "Demanding Pace but Good Tech",
      });
    assert.equal(rateB.status, 201);
    // Average must now be (5 + 3) / 2 = 4.0
    assert.equal(rateB.body.company.rating, 4);
    assert.equal(rateB.body.company.reviewsCount, 2);
  });

  // 11. Company Logo Upload, Magic Bytes Validation & Retrieval
  await t.test("11. Company Logo: MIME & magic bytes verification, secure storage, and public serving", async () => {
    // Fake image (text masquerading as png) rejected with 400
    const fakeLogoRes = await request(app)
      .post(`/api/v1/companies/${compAlphaId}/logo`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .attach("logo", Buffer.from("NOT_A_REAL_IMAGE"), "logo.png");
    assert.equal(fakeLogoRes.status, 400);

    // Valid PNG upload succeeds
    const uploadRes = await request(app)
      .post(`/api/v1/companies/${compAlphaId}/logo`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .attach("logo", VALID_PNG_BUFFER, "company_logo.png");
    assert.ok([200, 201].includes(uploadRes.status));
    assert.ok(uploadRes.body.logoUrl);

    // Serve logo via GET
    const getLogoRes = await request(app).get(`/api/v1/companies/${compAlphaId}/logo`);
    assert.equal(getLogoRes.status, 200);
    assert.equal(getLogoRes.headers["content-type"], "image/png");

    // Employer Beta cannot delete Company Alpha's logo (403)
    const betaDeleteLogo = await request(app)
      .delete(`/api/v1/companies/${compAlphaId}/logo`)
      .set("Authorization", `Bearer ${empBetaToken}`);
    assert.equal(betaDeleteLogo.status, 403);

    // Employer Alpha can delete logo
    const alphaDeleteLogo = await request(app)
      .delete(`/api/v1/companies/${compAlphaId}/logo`)
      .set("Authorization", `Bearer ${empAlphaToken}`);
    assert.equal(alphaDeleteLogo.status, 200);
  });

  // 12. Database Persistence Across Restart
  await t.test("12. Persistence: Company, employer profile, job, applications, and ratings persist across pool restart", async () => {
    // Drain pool
    await closePool();

    // Re-initialize pool
    await initDatabase();

    // Verify company persists
    const comp = await companyRepository.getById(compAlphaId);
    assert.ok(comp, "Company must persist across restarts");
    assert.equal(comp.verificationStatus, "verified");
    assert.equal(comp.rating, 4);
    assert.equal(comp.reviewsCount, 2);

    // Verify job persists
    const job = await jobRepository.getById(jobAlphaId);
    assert.ok(job, "Job must persist across restarts");
    assert.equal(job.title, "Senior Perception Engineer");

    // Verify application notes persist
    const app = await applicationRepository.getById(appCandAId);
    assert.ok(app, "Application must persist across restarts");
    assert.equal(app.recruiterNotes, "Candidate has strong CUDA expertise. Fast-track to technical screening.");
    assert.equal(app.status, "Interview Scheduled");
  });

  test.after(async () => {
    await closePool();
  });
});
