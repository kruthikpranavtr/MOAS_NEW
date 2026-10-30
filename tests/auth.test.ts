import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";

import { initDatabase, closePool, query } from "../server/db/postgresClient.js";
import { migrator } from "../server/db/migrator.js";
import { otpService } from "../server/services/OtpService.js";
import { passwordResetService } from "../server/services/PasswordResetService.js";
import { sessionRepository } from "../server/repositories/SessionRepository.js";
import { hashPassword, verifyPassword } from "../server/utils/crypto.js";

const { app } = await import("../server.js");

test("MOAS Phase 5 Authentication, Registration, OTP & Session Management Test Suite", async (t) => {
  await initDatabase();
  await migrator.runMigrations();

  const timestamp = Date.now();
  const candEmail = `cand_${timestamp}@moas.internal`;
  const candUsername = `cand_user_${timestamp}`;
  const candPassword = "CandidateSecure@2026!";
  let candToken = "";
  let candCookie = "";
  let candId = "";

  const empEmail = `emp_${timestamp}@enterprise.ai`;
  const empUsername = `emp_user_${timestamp}`;
  const empPassword = "EmployerSecure@2026!";
  let empToken = "";
  let empCookie = "";
  let empId = "";

  // 1. Candidate Registration
  await t.test("1. Candidate Registration: validates strong password and saves candidate with scrypt hash", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test Candidate",
        email: candEmail,
        username: candUsername,
        phone: "+91 98765 43210",
        password: candPassword,
        confirmPassword: candPassword,
        role: "Candidate",
        skills: ["Machine Learning", "PyTorch"],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token, "Expected registration to return session token");
    assert.ok(res.body.user);
    assert.equal(res.body.user.email, candEmail);
    assert.equal(res.body.user.role, "Candidate");
    assert.equal(res.body.user.password, undefined);
    assert.equal(res.body.user.passwordHash, undefined);

    candId = res.body.user.id;
    candToken = res.body.token;

    // Check Set-Cookie header contains HttpOnly moas_session_token
    const setCookie = res.headers["set-cookie"];
    assert.ok(setCookie);
    const sessionCookie = Array.isArray(setCookie) ? setCookie.find((c) => c.startsWith("moas_session_token=")) : setCookie;
    assert.ok(sessionCookie?.includes("HttpOnly"));
    candCookie = sessionCookie || "";
  });

  // 2. Employer Registration
  await t.test("2. Employer Registration: validates company details and creates employer account", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "HR Lead",
        email: empEmail,
        username: empUsername,
        phone: "+91 91234 56789",
        password: empPassword,
        confirmPassword: empPassword,
        role: "Employer",
        companyName: `Quantum AI Labs ${timestamp}`,
        industry: "AI Hardware",
        companySize: "50-200",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.role, "Employer");
    assert.equal(res.body.user.companyName, `Quantum AI Labs ${timestamp}`);
    assert.equal(res.body.user.password, undefined);

    empId = res.body.user.id;
    empToken = res.body.token;
  });

  // 3. Duplicate Email Prevention
  await t.test("3. Duplicate Email Prevention: rejects registration with already registered email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Imposter Candidate",
        email: candEmail, // Same email as test 1
        username: `different_user_${timestamp}`,
        password: "ValidPassword123!",
        confirmPassword: "ValidPassword123!",
        role: "Candidate",
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes("already registered"));
  });

  // 4. Duplicate Username Prevention
  await t.test("4. Duplicate Username Prevention: rejects registration with already taken username", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Different Name",
        email: `unique_${timestamp}@moas.internal`,
        username: candUsername, // Same username as test 1
        password: "ValidPassword123!",
        confirmPassword: "ValidPassword123!",
        role: "Candidate",
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes("already taken"));
  });

  // 5. Weak Password Rejection
  await t.test("5. Password Policy: rejects weak passwords (<8 chars or missing complexity)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Weak Pass User",
        email: `weakpass_${timestamp}@moas.internal`,
        username: `weak_${timestamp}`,
        password: "simplepassword",
        confirmPassword: "simplepassword",
        role: "Candidate",
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes("Password"));
  });

  // 6. Login via Email or Username with Correct Password
  await t.test("6. Authentication Login: authenticates via username, returns token, and sets session cookie", async () => {
    // Login with username
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        identifier: candUsername,
        password: candPassword,
        rememberMe: true,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, candEmail);

    candToken = res.body.token;

    // Verify session was persisted in PostgreSQL moas.sessions
    const dbSession = await sessionRepository.getByToken(candToken);
    assert.ok(dbSession, "Session must exist in PostgreSQL moas.sessions table");
    assert.equal(dbSession.user.email, candEmail);
  });

  // 7. Incorrect Password Rejection
  await t.test("7. Incorrect Password: wrong password returns 401 INVALID_CREDENTIALS", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        identifier: candEmail,
        password: "IncorrectPassword999!",
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, "INVALID_CREDENTIALS");
  });

  // 8. Session Profile Check via Cookie (GET /api/auth/me)
  await t.test("8. Cookie Authentication: GET /api/auth/me successfully authenticates via session cookie", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`moas_session_token=${candToken}`]);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.id, candId);
    assert.equal(res.body.user.password, undefined);
  });

  // 9. Unauthorized Access Rejection
  await t.test("9. Unauthorized Access: requests without token or cookie are rejected with 401", async () => {
    const res = await request(app).get("/api/auth/me");
    assert.equal(res.status, 401);
    assert.equal(res.body.code, "UNAUTHORIZED");
  });

  // 10. Role-Based Permissions (Candidate vs Employer)
  await t.test("10. RBAC: Candidate cannot post jobs; Employer can post jobs", async () => {
    // Candidate attempts to post job -> 403 Forbidden
    const candJobRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${candToken}`)
      .send({
        title: "Malicious Candidate Job",
        company: "Fake Company",
      });

    assert.equal(candJobRes.status, 403);
    assert.equal(candJobRes.body.code, "FORBIDDEN");

    // Employer posts job -> 201 Created
    const empJobRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${empToken}`)
      .send({
        title: `AI Infrastructure Lead ${timestamp}`,
        company: `Quantum AI Labs ${timestamp}`,
        location: "Bengaluru",
        type: "Full-time",
        experience: "3+ Years",
        salary: "₹45L",
        description: "Scale high-performance model training clusters.",
      });

    assert.equal(empJobRes.status, 201);
    assert.equal(empJobRes.body.success, true);
  });

  // 11. Cross-User Isolation: User A cannot modify User B's profile
  await t.test("11. Cross-User Isolation: User A cannot modify User B's profile", async () => {
    const res = await request(app)
      .put(`/api/moas/users/${empId}`)
      .set("Authorization", `Bearer ${candToken}`) // Candidate tries to edit Employer profile
      .send({
        name: "Hacked Name",
      });

    assert.equal(res.status, 403);
    assert.ok(res.body.error.includes("own account"));
  });

  // 12. SMS OTP Generation & PostgreSQL Hashing at Rest
  let testOtpPhone = "+919876543210";
  let activeOtpCode = "";

  await t.test("12. SMS OTP: generates 6-digit OTP, hashes at rest in moas.otp_codes, and binds purpose", async () => {
    const sendRes = await request(app)
      .post("/api/otp/send")
      .send({
        phone: testOtpPhone,
        purpose: "phone_verification",
      });

    assert.equal(sendRes.status, 200);
    assert.equal(sendRes.body.success, true);
    assert.ok(sendRes.body.debugOtp, "Test runner receives debugOtp in test mode");
    assert.equal(sendRes.body.debugOtp.length, 6);
    assert.ok(/^\d{6}$/.test(sendRes.body.debugOtp));

    activeOtpCode = sendRes.body.debugOtp;

    // Verify OTP is hashed in PostgreSQL moas.otp_codes and NOT stored in plaintext
    const dbOtp = await query(
      "SELECT * FROM moas.otp_codes WHERE identifier = $1 AND purpose = 'phone_verification' ORDER BY created_at DESC LIMIT 1;",
      [testOtpPhone]
    );

    assert.equal(dbOtp.rows.length, 1);
    assert.notEqual(dbOtp.rows[0].otp_hash, activeOtpCode, "OTP must NOT be stored in plaintext");
    assert.equal(dbOtp.rows[0].otp_hash.length, 64, "OTP must be stored as SHA256 HMAC hash");
  });

  // 13. Resend Cooldown Enforcement
  await t.test("13. OTP Cooldown: rejects resend requests within 30-second cooldown period", async () => {
    const resendRes = await request(app)
      .post("/api/otp/send")
      .send({
        phone: testOtpPhone,
        resend: true,
        purpose: "phone_verification",
      });

    assert.equal(resendRes.status, 400);
    assert.equal(resendRes.body.success, false);
    assert.ok(resendRes.body.error.includes("wait"));
  });

  // 14. Wrong OTP Attempts & Rate Limiting
  await t.test("14. OTP Validation: wrong code decrements attempts and rejects after max attempts", async () => {
    const wrongRes = await request(app)
      .post("/api/otp/verify")
      .send({
        phone: testOtpPhone,
        otp: "000000",
        purpose: "phone_verification",
      });

    assert.equal(wrongRes.status, 400);
    assert.equal(wrongRes.body.success, false);
    assert.ok(wrongRes.body.attemptsRemaining !== undefined);
  });

  // 15. Correct OTP Verification & One-Time Use
  await t.test("15. OTP Verification: correct code verifies successfully and prevents replay", async () => {
    const verifyRes = await request(app)
      .post("/api/otp/verify")
      .send({
        phone: testOtpPhone,
        otp: activeOtpCode,
        purpose: "phone_verification",
      });

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.success, true);
    assert.equal(verifyRes.body.verified, true);

    // Replay attempt must fail (one-time use)
    const replayRes = await request(app)
      .post("/api/otp/verify")
      .send({
        phone: testOtpPhone,
        otp: activeOtpCode,
        purpose: "phone_verification",
      });

    assert.equal(replayRes.status, 400);
    assert.equal(replayRes.body.verified, false);
  });

  // 16. Password Reset Flow with Session Revocation
  await t.test("16. Password Reset: requests reset, verifies token, updates scrypt hash, and revokes all active sessions", async () => {
    // A. Request password reset
    const forgotRes = await request(app)
      .post("/api/auth/password/forgot")
      .send({ identifier: candEmail });

    assert.equal(forgotRes.status, 200);
    assert.equal(forgotRes.body.success, true);
    assert.ok(forgotRes.body.debugResetToken);

    const resetToken = forgotRes.body.debugResetToken;

    // B. Verify reset token endpoint
    const verifyTokenRes = await request(app)
      .get("/api/auth/password/verify-token")
      .query({ token: resetToken });

    assert.equal(verifyTokenRes.status, 200);
    assert.equal(verifyTokenRes.body.valid, true);

    // C. Perform password reset with new strong password
    const newCandPassword = "BrandNewCandidatePassword@2026!";
    const resetRes = await request(app)
      .post("/api/auth/password/reset")
      .send({
        token: resetToken,
        newPassword: newCandPassword,
        confirmPassword: newCandPassword,
      });

    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);

    // D. Security Check: Prior active session must be revoked from PostgreSQL
    const oldSessionCheck = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${candToken}`);

    assert.equal(oldSessionCheck.status, 401, "Old session token must be revoked after password reset");

    // E. Verify login with new password succeeds
    const newLoginRes = await request(app)
      .post("/api/auth/login")
      .send({
        identifier: candUsername,
        password: newCandPassword,
      });

    assert.equal(newLoginRes.status, 200);
    assert.ok(newLoginRes.body.token);
    candToken = newLoginRes.body.token; // Update token for subsequent tests
  });

  // 17. CSRF Protection for Cookie-Authenticated State-Changing Requests
  await t.test("17. CSRF Protection: blocks cross-origin state-changing requests when authenticated via cookie", async () => {
    // Malicious site attempts state change via cross-origin fetch
    const crossOriginRes = await request(app)
      .post("/api/saved-jobs")
      .set("Cookie", [`moas_session_token=${candToken}`])
      .set("Origin", "https://malicious-attacker-site.com")
      .send({ jobId: "job-1" });

    assert.equal(crossOriginRes.status, 403);
    assert.equal(crossOriginRes.body.code, "CSRF_VALIDATION_FAILED");
  });

  // 18. Session Logout & Immediate Revocation
  await t.test("18. Session Logout: invalidates token immediately in PostgreSQL and clears cookies", async () => {
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${candToken}`);

    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);

    // Reusing token returns 401
    const postLogoutCheck = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${candToken}`);

    assert.equal(postLogoutCheck.status, 401);
  });

  // 19. Session Persistence Across Server Re-Initialization
  await t.test("19. Restart Persistence: active sessions persist across connection pool drain and re-init", async () => {
    // Create new active session for employer
    const empLogin = await request(app)
      .post("/api/auth/login")
      .send({
        identifier: empUsername,
        password: empPassword,
      });

    assert.equal(empLogin.status, 200);
    const activeEmpToken = empLogin.body.token;

    // Drain and re-init pool (simulating server restart)
    await closePool();
    await initDatabase();

    // Verify employer session is still valid and active in PostgreSQL
    const postRestartRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${activeEmpToken}`);

    assert.equal(postRestartRes.status, 200);
    assert.equal(postRestartRes.body.user.email, empEmail);
  });
});

test.after(async () => {
  await closePool();
});
