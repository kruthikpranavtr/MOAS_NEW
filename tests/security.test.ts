import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

// Set test environment so server does not auto-bind PORT or launch Vite dev server
process.env.NODE_ENV = "test";

import { initDatabase, closePool } from "../server/db/postgresClient.js";
import { migrator } from "../server/db/migrator.js";

// Import initialized Express app
const { app } = await import("../server.js");

test("MOAS Security & Production Runtime Test Suite", async (t) => {
  await initDatabase();
  await migrator.runMigrations();

  // Test tokens and test user state
  let candidateToken: string = "";
  let candidateId: string = "";
  let employerToken: string = "";
  let employerId: string = "";
  let attackerToken: string = "";
  let attackerId: string = "";
  let createdJobId: string = "";
  let createdAppId: string = "";

  // 1. Production Startup & Health Check
  await t.test("1. Production startup: server is healthy and responds to /api/health", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.ok(typeof res.body.service === "string" && res.body.service.includes("MOAS"));
  });

  // 2. Arbitrary SQL Execution Endpoint Removal
  await t.test("2. Vulnerability fix: POST /api/db/postgres/query is completely removed (returns 404)", async () => {
    const res = await request(app)
      .post("/api/db/postgres/query")
      .send({ sql: "SELECT * FROM users;" });
    assert.equal(res.status, 404);
  });

  // 3. Admin Database Endpoint Protections
  await t.test("3. Admin endpoints: /api/db/seed and /api/db/postgres/tables/:table require authentication", async () => {
    const seedRes = await request(app).post("/api/db/seed").send({});
    assert.equal(seedRes.status, 401);

    const tablesRes = await request(app).get("/api/db/postgres/tables/jobs");
    assert.equal(tablesRes.status, 401);
  });

  // 4. User Registration and Password Hashing
  await t.test("4. User registration: stores hashed password and never returns plaintext password or hash", async () => {
    candidateId = `test-cand-${Date.now()}`;
    const rawPassword = "CandidateSecurePassword@2026!";

    const regRes = await request(app)
      .post("/api/moas/users")
      .send({
        id: candidateId,
        username: `user_${candidateId}`,
        name: "Test Candidate",
        email: `${candidateId}@moas.internal`,
        password: rawPassword,
        role: "Candidate",
      });

    assert.equal(regRes.status, 200);
    assert.equal(regRes.body.success, true);
    assert.ok(regRes.body.token, "Expected registration to return session token");
    candidateToken = regRes.body.token;

    // Verify password is NOT in returned user object
    assert.equal(regRes.body.user.password, undefined);
    assert.equal(regRes.body.user.passwordHash, undefined);
  });

  // 5. Successful and Failed Login
  await t.test("5. Authentication: successful login issues valid token; wrong password returns 401", async () => {
    // A. Successful login
    const loginOk = await request(app)
      .post("/api/auth/login")
      .send({
        identifier: candidateId,
        password: "CandidateSecurePassword@2026!",
      });

    assert.equal(loginOk.status, 200);
    assert.equal(loginOk.body.success, true);
    assert.ok(loginOk.body.token);
    assert.equal(loginOk.body.user.password, undefined);
    assert.equal(loginOk.body.user.passwordHash, undefined);
    candidateToken = loginOk.body.token;

    // B. Failed login: wrong password
    const loginWrong = await request(app)
      .post("/api/auth/login")
      .send({
        identifier: candidateId,
        password: "WrongPassword123!",
      });

    assert.equal(loginWrong.status, 401);
    assert.equal(loginWrong.body.success, false);
    assert.equal(loginWrong.body.code, "INVALID_CREDENTIALS");

    // C. Failed login: non-existent user
    const loginUnknown = await request(app)
      .post("/api/auth/login")
      .send({
        identifier: "non-existent-user-id-99999",
        password: "SomePassword!",
      });

    assert.equal(loginUnknown.status, 404);
    assert.equal(loginUnknown.body.code, "USER_NOT_FOUND");
  });

  // 6. Password Protection across all User APIs
  await t.test("6. Password protection: GET /api/moas/users and /api/moas/users/:id never leak passwords", async () => {
    const listRes = await request(app).get("/api/moas/users");
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.users));

    for (const u of listRes.body.users) {
      assert.equal(u.password, undefined, `User ${u.id} exposed password!`);
      assert.equal(u.passwordHash, undefined, `User ${u.id} exposed passwordHash!`);
    }

    const singleRes = await request(app).get(`/api/moas/users/${candidateId}`);
    assert.equal(singleRes.status, 200);
    assert.equal(singleRes.body.user.password, undefined);
    assert.equal(singleRes.body.user.passwordHash, undefined);
  });

  // 7. Setup Employer and Attacker Accounts
  await t.test("7. Account setup: register Employer and Attacker accounts for RBAC and ownership tests", async () => {
    employerId = `test-emp-${Date.now()}`;
    const empRes = await request(app)
      .post("/api/moas/users")
      .send({
        id: employerId,
        username: `employer_${employerId}`,
        name: "Test Hiring Manager",
        email: `${employerId}@company.internal`,
        password: "EmployerPassword@2026!",
        role: "Employer",
        companyName: "Acme Tech",
      });
    assert.equal(empRes.status, 200);
    employerToken = empRes.body.token;

    attackerId = `test-atk-${Date.now()}`;
    const atkRes = await request(app)
      .post("/api/moas/users")
      .send({
        id: attackerId,
        username: `attacker_${attackerId}`,
        name: "Malicious User",
        email: `${attackerId}@attacker.internal`,
        password: "AttackerPassword@2026!",
        role: "Candidate",
      });
    assert.equal(atkRes.status, 200);
    attackerToken = atkRes.body.token;
  });

  // 8. Unauthorized API Access
  await t.test("8. Unauthorized access: sensitive endpoints reject unauthenticated requests with 401", async () => {
    const unauthJob = await request(app).post("/api/jobs").send({ title: "Hack Job", company: "Hack Corp" });
    assert.equal(unauthJob.status, 401);

    const unauthApp = await request(app).post("/api/applications").send({ jobId: "job-1" });
    assert.equal(unauthApp.status, 401);

    const unauthProfile = await request(app).put(`/api/moas/users/${candidateId}`).send({ name: "Hacked Name" });
    assert.equal(unauthProfile.status, 401);

    const unauthResume = await request(app).post("/api/moas/upload-resume").send({
      userId: candidateId,
      resume: { name: "test.pdf" },
    });
    assert.equal(unauthResume.status, 401);
  });

  // 9. Employer and Candidate Role Restrictions
  await t.test("9. Role restrictions: Candidate cannot post jobs or patch application statuses", async () => {
    // Candidate attempts to post job -> 403 Forbidden
    const candJobRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${candidateToken}`)
      .send({
        title: "Unauthorized Job Post",
        company: "Fake Inc",
        location: "Remote",
        salary: "$100k",
      });
    assert.equal(candJobRes.status, 403);

    // Employer posts job -> 201 Created
    const empJobRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${employerToken}`)
      .send({
        title: "Senior AI Engineer",
        company: "Acme Tech",
        location: "Bangalore / Remote",
        salary: "$150,000",
      });
    assert.equal(empJobRes.status, 201);
    assert.equal(empJobRes.body.success, true);
    createdJobId = empJobRes.body.job.id;

    // Candidate submits application -> 201 Created
    const candAppRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${candidateToken}`)
      .send({
        jobId: createdJobId,
        jobTitle: "Senior AI Engineer",
        company: "Acme Tech",
        resumeName: "Candidate_Resume.pdf",
      });
    assert.equal(candAppRes.status, 201);
    createdAppId = candAppRes.body.application.id;

    // Candidate attempts to update application status -> 403 Forbidden
    const candPatchRes = await request(app)
      .patch(`/api/applications/${createdAppId}`)
      .set("Authorization", `Bearer ${candidateToken}`)
      .send({ status: "Offered", stage: "Hired" });
    assert.equal(candPatchRes.status, 403);

    // Employer updates application status -> 200 OK
    const empPatchRes = await request(app)
      .patch(`/api/applications/${createdAppId}`)
      .set("Authorization", `Bearer ${employerToken}`)
      .send({ status: "Interview Scheduled", stage: "Technical Round" });
    assert.equal(empPatchRes.status, 200);
    assert.equal(empPatchRes.body.application.status, "Interview Scheduled");
  });

  // 10. User Ownership Restrictions
  await t.test("10. Ownership restrictions: Attacker cannot modify Victim's profile, resume, or applications", async () => {
    // Attacker attempts to update Candidate's profile -> 403 Forbidden
    const hijackRes = await request(app)
      .put(`/api/moas/users/${candidateId}`)
      .set("Authorization", `Bearer ${attackerToken}`)
      .send({ name: "Account Hijacked" });
    assert.equal(hijackRes.status, 403);

    // Attacker attempts to upload resume to Candidate's account -> 403 Forbidden
    const resumeHijack = await request(app)
      .post("/api/moas/upload-resume")
      .set("Authorization", `Bearer ${attackerToken}`)
      .send({
        userId: candidateId,
        email: `${candidateId}@moas.internal`,
        resume: { name: "malicious.pdf" },
      });
    assert.equal(resumeHijack.status, 403);

    // Attacker attempts to delete Candidate's application -> 403 Forbidden
    const delAppHijack = await request(app)
      .delete(`/api/applications/${createdAppId}`)
      .set("Authorization", `Bearer ${attackerToken}`);
    assert.equal(delAppHijack.status, 403);

    // Legitimate candidate updates their own profile -> 200 OK
    const ownUpdate = await request(app)
      .put(`/api/moas/users/${candidateId}`)
      .set("Authorization", `Bearer ${candidateToken}`)
      .send({ name: "Verified Candidate Name" });
    assert.equal(ownUpdate.status, 200);
    assert.equal(ownUpdate.body.user.name, "Verified Candidate Name");
    assert.equal(ownUpdate.body.user.password, undefined);
  });

  // 11. SMS Secrets & Safe Fallback Verification
  await t.test("11. Secrets protection: TextBee API key fallback removed and handles missing env safely", async () => {
    delete process.env.TEXTBEE_API_KEY;
    delete process.env.TEXTBEE_DEVICE_ID;

    const otpRes = await request(app)
      .post("/api/otp/send")
      .send({ phone: `+91 99999 ${String(Date.now()).slice(-5)}` });

    assert.equal(otpRes.status, 200);
    assert.equal(otpRes.body.success, true);
    assert.equal(otpRes.body.smsSent, false);
    assert.equal(otpRes.body.message, "SMS gateway is not configured.");
  });

  // 12. Session Invalidation / Logout
  await t.test("12. Session logout: invalidates session token immediately", async () => {
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${candidateToken}`);
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);

    // Reusing invalidated token returns 401
    const postLogoutMe = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${candidateToken}`);
    assert.equal(postLogoutMe.status, 401);
  });
});

test.after(async () => {
  await closePool();
});
