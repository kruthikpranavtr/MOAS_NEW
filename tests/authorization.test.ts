import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";

import { initDatabase, closePool, query } from "../server/db/postgresClient.js";
import { migrator } from "../server/db/migrator.js";
import { companyRepository } from "../server/repositories/CompanyRepository.js";
import { companyMemberRepository } from "../server/repositories/CompanyMemberRepository.js";
import { userRepository } from "../server/repositories/UserRepository.js";
import { hashPassword } from "../server/utils/crypto.js";

const { app } = await import("../server.js");

test("MOAS Phase 6 Role-Based Access Control & Permissions Test Suite", async (t) => {
  await initDatabase();
  await migrator.runMigrations();

  const timestamp = Date.now();

  // Test accounts setup
  const candAEmail = `cand_a_${timestamp}@moas.internal`;
  const candAPassword = "CandidateSecure@2026!";
  let candAToken = "";
  let candACookie = "";
  let candAId = "";

  const candBEmail = `cand_b_${timestamp}@moas.internal`;
  const candBPassword = "CandidateSecure@2026!";
  let candBToken = "";
  let candBCookie = "";
  let candBId = "";

  const empAlphaEmail = `emp_alpha_${timestamp}@alpha.corp`;
  const empAlphaPassword = "EmployerAlpha@2026!";
  let empAlphaToken = "";
  let empAlphaCookie = "";
  let empAlphaId = "";
  let compAlphaId = "";

  const empBetaEmail = `emp_beta_${timestamp}@beta.corp`;
  const empBetaPassword = "EmployerBeta@2026!";
  let empBetaToken = "";
  let empBetaCookie = "";
  let empBetaId = "";
  let compBetaId = "";

  const adminEmail = `admin_${timestamp}@moas.internal`;
  const adminPassword = "AdminSecure@2026!";
  let adminToken = "";
  let adminCookie = "";
  let adminId = "";

  let jobAlphaId = "";
  let jobBetaId = "";
  let appCandAtoAlphaId = "";

  // 1. Setup accounts
  await t.test("Setup: provision isolated accounts for Candidate A, Candidate B, Employer Alpha, Employer Beta, and Admin", async () => {
    // Register Candidate A
    const resCandA = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Alice Candidate",
        email: candAEmail,
        username: `alice_${timestamp}`,
        password: candAPassword,
        confirmPassword: candAPassword,
        role: "Candidate",
      });
    assert.equal(resCandA.status, 201);
    candAId = resCandA.body.user.id;
    candAToken = resCandA.body.token;
    candACookie = resCandA.headers["set-cookie"]?.[0]?.split(";")[0] || "";

    // Register Candidate B
    const resCandB = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Bob Candidate",
        email: candBEmail,
        username: `bob_${timestamp}`,
        password: candBPassword,
        confirmPassword: candBPassword,
        role: "Candidate",
      });
    assert.equal(resCandB.status, 201);
    candBId = resCandB.body.user.id;
    candBToken = resCandB.body.token;
    candBCookie = resCandB.headers["set-cookie"]?.[0]?.split(";")[0] || "";

    // Register Employer Alpha
    const resEmpAlpha = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Alpha Recruiter",
        email: empAlphaEmail,
        username: `alpha_rec_${timestamp}`,
        password: empAlphaPassword,
        confirmPassword: empAlphaPassword,
        role: "Employer",
        companyName: `Alpha Corp ${timestamp}`,
      });
    assert.equal(resEmpAlpha.status, 201);
    empAlphaId = resEmpAlpha.body.user.id;
    empAlphaToken = resEmpAlpha.body.token;
    empAlphaCookie = resEmpAlpha.headers["set-cookie"]?.[0]?.split(";")[0] || "";

    // Register Employer Beta
    const resEmpBeta = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Beta Recruiter",
        email: empBetaEmail,
        username: `beta_rec_${timestamp}`,
        password: empBetaPassword,
        confirmPassword: empBetaPassword,
        role: "Employer",
        companyName: `Beta Corp ${timestamp}`,
      });
    assert.equal(resEmpBeta.status, 201);
    empBetaId = resEmpBeta.body.user.id;
    empBetaToken = resEmpBeta.body.token;
    empBetaCookie = resEmpBeta.headers["set-cookie"]?.[0]?.split(";")[0] || "";

    // Provision Admin via verified repository insertion (preventing self-registration)
    adminId = `admin-usr-${timestamp}`;
    await userRepository.save({
      id: adminId,
      email: adminEmail,
      username: `admin_${timestamp}`,
      password: adminPassword,
      name: "Platform Administrator",
      phone: "+91 99999 88888",
      avatarUrl: "https://avatar.moas.internal/admin.jpg",
      location: "Bangalore, India",
      role: "Admin",
      emailVerified: true,
      createdAt: new Date().toISOString(),
    });

    const loginAdminRes = await request(app)
      .post("/api/auth/login")
      .send({
        username: `admin_${timestamp}`,
        password: adminPassword,
      });
    assert.equal(loginAdminRes.status, 200);
    adminToken = loginAdminRes.body.token;
    adminCookie = loginAdminRes.headers["set-cookie"]?.[0]?.split(";")[0] || "";
    assert.equal(loginAdminRes.body.user.role, "Admin");
  });

  // 2. Candidate access to own profile vs other's profile
  await t.test("2. Candidate Data Protection: candidate can access own profile, but cannot edit another candidate's profile", async () => {
    // Candidate A accesses own profile
    const getOwnRes = await request(app)
      .get(`/api/moas/users/${candAId}`)
      .set("Authorization", `Bearer ${candAToken}`);
    assert.equal(getOwnRes.status, 200);
    assert.equal(getOwnRes.body.user.id, candAId);

    // Candidate A updates own profile
    const updateOwnRes = await request(app)
      .put(`/api/moas/users/${candAId}`)
      .set("Authorization", `Bearer ${candAToken}`)
      .send({ headline: "Senior ML Engineer" });
    assert.equal(updateOwnRes.status, 200);

    // Candidate A attempts to edit Candidate B's profile -> 403 Forbidden
    const editOtherRes = await request(app)
      .put(`/api/moas/users/${candBId}`)
      .set("Authorization", `Bearer ${candAToken}`)
      .send({ headline: "Hacked Headline" });
    assert.equal(editOtherRes.status, 403);
    assert.equal(editOtherRes.body.code, "FORBIDDEN");
  });

  // 3. Job Creation authorization
  await t.test("3. Job Creation: Employer can post jobs; Candidate is rejected with 403", async () => {
    // Candidate attempts to create a job -> 403 Forbidden
    const candJobRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        title: "Malicious Job",
        company: `Alpha Corp ${timestamp}`,
        location: "Remote",
      });
    assert.equal(candJobRes.status, 403);

    // Employer Alpha creates a job -> 201 Created
    const empAlphaJobRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        title: "Alpha Senior ML Lead",
        company: `Alpha Corp ${timestamp}`,
        location: "San Francisco, CA",
        salary: "$200,000",
      });
    assert.equal(empAlphaJobRes.status, 201);
    assert.ok(empAlphaJobRes.body.job.id);
    jobAlphaId = empAlphaJobRes.body.job.id;
    compAlphaId = empAlphaJobRes.body.job.companyId;

    // Employer Beta creates a job -> 201 Created
    const empBetaJobRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${empBetaToken}`)
      .send({
        title: "Beta Research Scientist",
        company: `Beta Corp ${timestamp}`,
        location: "New York, NY",
        salary: "$190,000",
      });
    assert.equal(empBetaJobRes.status, 201);
    jobBetaId = empBetaJobRes.body.job.id;
    compBetaId = empBetaJobRes.body.job.companyId;
  });

  // 4. Cross-company job modification prevention
  await t.test("4. Employer Cross-Company Protection: Employer Beta cannot edit or delete Employer Alpha's jobs", async () => {
    // Employer Beta attempts to modify Job Alpha -> 403 Forbidden
    const editAlphaRes = await request(app)
      .put(`/api/jobs/${jobAlphaId}`)
      .set("Authorization", `Bearer ${empBetaToken}`)
      .send({
        title: "Hijacked Job Title",
        salary: "$1",
      });
    assert.equal(editAlphaRes.status, 403);
    assert.equal(editAlphaRes.body.code, "FORBIDDEN");

    // Employer Beta attempts to delete Job Alpha -> 403 Forbidden
    const deleteAlphaRes = await request(app)
      .delete(`/api/jobs/${jobAlphaId}`)
      .set("Authorization", `Bearer ${empBetaToken}`);
    assert.equal(deleteAlphaRes.status, 403);
    assert.equal(deleteAlphaRes.body.code, "FORBIDDEN");

    // Employer Alpha can edit own job -> 200 OK
    const legitEditRes = await request(app)
      .put(`/api/jobs/${jobAlphaId}`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        title: "Alpha Senior ML Principal Lead",
      });
    assert.equal(legitEditRes.status, 200);
    assert.equal(legitEditRes.body.job.title, "Alpha Senior ML Principal Lead");
  });

  // 5. Candidate Application Submission & Status Control
  await t.test("5. Application Lifecycle: Candidate submits application; Candidate cannot self-assign status", async () => {
    // Candidate A applies for Job Alpha -> 201 Created
    const applyRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        jobId: jobAlphaId,
        jobTitle: "Alpha Senior ML Principal Lead",
        company: `Alpha Corp ${timestamp}`,
        resumeName: "Alice_ML_Resume.pdf",
      });
    assert.equal(applyRes.status, 201);
    appCandAtoAlphaId = applyRes.body.application.id;
    assert.equal(applyRes.body.application.status, "Applied");
    assert.equal(applyRes.body.application.candidateId, candAId);

    // Candidate A attempts to assign self "Offered" status -> 403 Forbidden
    const selfPromoteRes = await request(app)
      .patch(`/api/applications/${appCandAtoAlphaId}`)
      .set("Authorization", `Bearer ${candAToken}`)
      .send({ status: "Offered" });
    assert.equal(selfPromoteRes.status, 403);

    // Candidate B attempts to delete Candidate A's application -> 403 Forbidden
    const candBDeleteRes = await request(app)
      .delete(`/api/applications/${appCandAtoAlphaId}`)
      .set("Authorization", `Bearer ${candBToken}`);
    assert.equal(candBDeleteRes.status, 403);
  });

  // 6. Cross-Company Applicant Review & Status Transition
  await t.test("6. Applicant Privacy: Employer Alpha can view and advance applicant; Employer Beta cannot view unrelated applicant", async () => {
    // Employer Alpha views applicants for Job Alpha -> 200 OK
    const alphaAppsRes = await request(app)
      .get("/api/applications")
      .set("Authorization", `Bearer ${empAlphaToken}`);
    assert.equal(alphaAppsRes.status, 200);
    const alphaHasAlice = alphaAppsRes.body.applications.some(
      (a: any) => a.id === appCandAtoAlphaId
    );
    assert.equal(alphaHasAlice, true);

    // Employer Beta views applicants -> Alice must NOT appear in Beta's list
    const betaAppsRes = await request(app)
      .get("/api/applications")
      .set("Authorization", `Bearer ${empBetaToken}`);
    assert.equal(betaAppsRes.status, 200);
    const betaHasAlice = betaAppsRes.body.applications.some(
      (a: any) => a.id === appCandAtoAlphaId
    );
    assert.equal(betaHasAlice, false, "Employer Beta must not see Alice's application to Alpha Corp");

    // Employer Beta attempts to get Alice's application directly by ID -> 403 Forbidden
    const betaDirectAppRes = await request(app)
      .get(`/api/applications/${appCandAtoAlphaId}`)
      .set("Authorization", `Bearer ${empBetaToken}`);
    assert.equal(betaDirectAppRes.status, 403);

    // Employer Alpha advances Alice's status: Applied -> Shortlisted -> 200 OK
    const advanceRes = await request(app)
      .patch(`/api/applications/${appCandAtoAlphaId}`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ status: "Shortlisted", stage: "Resume Review" });
    assert.equal(advanceRes.status, 200);
    assert.equal(advanceRes.body.application.status, "Shortlisted");

    // Invalid Status Transition: Shortlisted cannot jump straight to Hired without Offer
    const invalidTransRes = await request(app)
      .patch(`/api/applications/${appCandAtoAlphaId}`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ status: "Hired" });
    assert.equal(invalidTransRes.status, 400);
    assert.ok(
      (invalidTransRes.body.error || invalidTransRes.body.message || "").includes("Invalid status transition")
    );
  });

  // 7. Resume Data Access Control
  await t.test("7. Resume Privacy: Candidate A's resume is inaccessible to Candidate B and unrelated Employer Beta, accessible to Employer Alpha", async () => {
    // Candidate A uploads resume
    const uploadRes = await request(app)
      .post("/api/moas/upload-resume")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        userId: candAId,
        email: candAEmail,
        resume: {
          name: "Alice_Confidential_Resume.pdf",
          fileUrl: "https://moas.storage/resumes/alice_confidential.pdf",
          skills: ["PyTorch", "Kubernetes", "Transformers"],
        },
      });
    assert.equal(uploadRes.status, 200);

    // Candidate B attempts to view Candidate A's resume -> 403 Forbidden
    const candBResumeRes = await request(app)
      .get(`/api/moas/resumes/${candAId}`)
      .set("Authorization", `Bearer ${candBToken}`);
    assert.equal(candBResumeRes.status, 403);

    // Employer Beta (no applications from Alice) attempts to view Alice's resume -> 403 Forbidden
    const empBetaResumeRes = await request(app)
      .get(`/api/moas/resumes/${candAId}`)
      .set("Authorization", `Bearer ${empBetaToken}`);
    assert.equal(empBetaResumeRes.status, 403);

    // Employer Alpha (Alice applied to Job Alpha) views Alice's resume -> 200 OK
    const empAlphaResumeRes = await request(app)
      .get(`/api/moas/resumes/${candAId}`)
      .set("Authorization", `Bearer ${empAlphaToken}`);
    assert.equal(empAlphaResumeRes.status, 200);
    assert.equal(empAlphaResumeRes.body.resume.name, "Alice_Confidential_Resume.pdf");
  });

  // 8. Saved Jobs, Job Alerts, and Profile Views Privacy
  await t.test("8. Candidate Personal Data: Saved jobs, alerts, and views are strictly private", async () => {
    // Candidate A saves Job Alpha
    const saveJobRes = await request(app)
      .post("/api/saved-jobs")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({ jobId: jobAlphaId });
    assert.equal(saveJobRes.status, 200);

    // Candidate B checks saved jobs -> only Bob's saved jobs returned (empty)
    const candBSavedRes = await request(app)
      .get("/api/saved-jobs")
      .set("Authorization", `Bearer ${candBToken}`);
    assert.equal(candBSavedRes.status, 200);
    assert.equal(candBSavedRes.body.savedJobs.length, 0);

    // Candidate A creates a job alert
    const createAlertRes = await request(app)
      .post("/api/alerts")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        title: "ML Lead Alerts",
        keywords: "ML, PyTorch",
        location: "Remote",
      });
    assert.equal(createAlertRes.status, 201);
    const alertId = createAlertRes.body.alert.id;

    // Candidate B attempts to delete Candidate A's alert -> 403 Forbidden
    const candBDeleteAlertRes = await request(app)
      .delete(`/api/alerts/${alertId}`)
      .set("Authorization", `Bearer ${candBToken}`);
    assert.equal(candBDeleteAlertRes.status, 403);

    // Candidate B checks alerts -> Candidate A's alert is not visible
    const candBAlertsRes = await request(app)
      .get("/api/alerts")
      .set("Authorization", `Bearer ${candBToken}`);
    assert.equal(candBAlertsRes.status, 200);
    assert.equal(candBAlertsRes.body.alerts.length, 0);

    // Profile Views: Candidate B attempts to reset Candidate A's profile views -> 403 Forbidden
    const resetOtherViewsRes = await request(app)
      .post("/api/moas/profile-views/reset")
      .set("Authorization", `Bearer ${candBToken}`)
      .send({ userId: candAId });
    assert.equal(resetOtherViewsRes.status, 403);
  });

  // 9. Admin Security & Self-Registration Prevention
  await t.test("9. Admin Security: Registration cannot create Admin; normal users cannot access admin endpoints", async () => {
    // Attempt to self-register as Admin -> downgraded to Candidate
    const fakeAdminRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Fake Admin",
        email: `fake_admin_${timestamp}@attacker.com`,
        username: `fake_admin_${timestamp}`,
        password: "FakeAdminPass@2026!",
        confirmPassword: "FakeAdminPass@2026!",
        role: "Admin",
      });
    assert.equal(fakeAdminRes.status, 201);
    assert.equal(
      fakeAdminRes.body.user.role,
      "Candidate",
      "Registration must reject or downgrade self-assigned Admin role"
    );

    // Candidate attempts to view Admin Audit Logs -> 403 Forbidden
    const candAuditRes = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${candAToken}`);
    assert.equal(candAuditRes.status, 403);

    // Employer attempts to view Admin Audit Logs -> 403 Forbidden
    const empAuditRes = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${empAlphaToken}`);
    assert.equal(empAuditRes.status, 403);

    // Verified Admin views Audit Logs -> 200 OK
    const adminAuditRes = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(adminAuditRes.status, 200);
    assert.ok(Array.isArray(adminAuditRes.body.logs));
    assert.ok(adminAuditRes.body.logs.length > 0);
  });

  // 10. Privilege Escalation & Mass Assignment Prevention
  await t.test("10. Privilege Escalation: Profile update strips role, id, and password tampering attempts", async () => {
    // Candidate A attempts to escalate role to Admin via profile update
    const escalateRes = await request(app)
      .put(`/api/moas/users/${candAId}`)
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        role: "Admin",
        id: "new-admin-id",
        password: "NewHackedPassword@2026!",
        name: "Alice Escalated",
      });
    assert.equal(escalateRes.status, 200);

    // Check user record: role must remain Candidate, ID unchanged, password unchanged
    const verifyUserRes = await request(app)
      .get(`/api/moas/users/${candAId}`)
      .set("Authorization", `Bearer ${candAToken}`);
    assert.equal(verifyUserRes.body.user.role, "Candidate");
    assert.equal(verifyUserRes.body.user.id, candAId);

    // Normal user attempts to change another user's role via admin route -> 403 Forbidden
    const spoofRoleRes = await request(app)
      .patch(`/api/admin/users/${candAId}/role`)
      .set("Authorization", `Bearer ${candAToken}`)
      .send({ role: "Admin" });
    assert.equal(spoofRoleRes.status, 403);

    // Verified Admin can update user role -> 200 OK
    const legitRoleRes = await request(app)
      .patch(`/api/admin/users/${candAId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "Employer" });
    assert.equal(legitRoleRes.status, 200);
    assert.equal(legitRoleRes.body.user.role, "Employer");

    // Revert role back for clean state
    await request(app)
      .patch(`/api/admin/users/${candAId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "Candidate" });
  });

  // 11. Company Verification Authorization
  await t.test("11. Company Verification: Employer cannot self-verify; only Admin can verify companies", async () => {
    // Employer Alpha attempts to self-verify Alpha Corp -> 403 Forbidden
    const selfVerifyRes = await request(app)
      .patch(`/api/companies/${compAlphaId}/verify`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ verified: true });
    assert.equal(selfVerifyRes.status, 403);

    // Verified Admin verifies Alpha Corp -> 200 OK
    const adminVerifyRes = await request(app)
      .patch(`/api/companies/${compAlphaId}/verify`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ verified: true });
    assert.equal(adminVerifyRes.status, 200);
    assert.equal(adminVerifyRes.body.company.verified, true);
  });

  // 12. CSRF Protection on Cookie Requests without Origin/Referer
  await t.test("12. CSRF Hardening: Cookie-authenticated state-changing requests lacking Origin/Referer are blocked unless double-submit token is provided", async () => {
    // Blind POST with cookie, without Origin and without Referer and without x-csrf-token -> 403 Forbidden
    const blindCsrfRes = await request(app)
      .post("/api/saved-jobs")
      .set("Cookie", candACookie)
      .send({ jobId: jobAlphaId });
    assert.equal(blindCsrfRes.status, 403);
    assert.equal(blindCsrfRes.body.code, "CSRF_VALIDATION_FAILED");

    // With Double-Submit CSRF Token -> 200 OK
    const csrfToken = "valid-double-submit-test-token-2026";
    const legitCsrfRes = await request(app)
      .post("/api/saved-jobs")
      .set("Cookie", `${candACookie}; moas_csrf_token=${csrfToken}`)
      .set("x-csrf-token", csrfToken)
      .send({ jobId: jobAlphaId });
    assert.equal(legitCsrfRes.status, 200);
  });

  // 13. Restart Persistence & Integrity
  await t.test("13. Persistence & Integrity: RBAC permissions and session credentials remain consistent across pool drain and restart", async () => {
    await closePool();
    await initDatabase();

    // Verify Candidate A session remains valid after pool re-init
    const restartAuthRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${candAToken}`);
    assert.equal(restartAuthRes.status, 200);
    assert.equal(restartAuthRes.body.user.id, candAId);
    assert.equal(restartAuthRes.body.user.role, "Candidate");

    // Verify Admin audit logs persist
    const restartAuditRes = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(restartAuditRes.status, 200);
    assert.ok(restartAuditRes.body.logs.length >= 3);
  });

  await closePool();
});
