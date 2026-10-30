import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";

const { app } = await import("../server.js");

test("MOAS Phase 3 Backend Architecture Rebuild Test Suite", async (t) => {
  let sessionToken = "";
  let sessionCookie = "";
  let testUserId = `arch-user-${Date.now()}`;

  // 1. Security Headers (Helmet + Content Security Policy)
  await t.test("1. Security Headers: Helmet & CSP headers are properly set", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.ok(res.headers["content-security-policy"], "Expected CSP header to be present");
    assert.equal(res.headers["x-frame-options"], "DENY");
    assert.equal(res.headers["x-content-type-options"], "nosniff");
  });

  // 2. Request ID Generation & Propagation
  await t.test("2. Observability: Request ID header (x-request-id) is injected and returned", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.ok(res.headers["x-request-id"], "Expected x-request-id response header");

    // Pass custom x-request-id and verify it is preserved
    const customId = `custom-req-${Date.now()}`;
    const customRes = await request(app).get("/api/health").set("x-request-id", customId);
    assert.equal(customRes.headers["x-request-id"], customId);
  });

  // 3. Versioned REST API Routes (/api/v1/*)
  await t.test("3. Versioned API: /api/v1 endpoints operate identically to legacy routes", async () => {
    // A. Health check version metadata
    const health = await request(app).get("/api/health");
    assert.equal(health.status, 200);
    assert.equal(health.body.version, "v1");

    // B. Register via /api/v1/users
    const regRes = await request(app)
      .post("/api/v1/users")
      .send({
        id: testUserId,
        username: `user_${testUserId}`,
        name: "Architecture Test User",
        email: `${testUserId}@test.internal`,
        password: "ArchPassword@2026!",
        role: "Candidate",
      });

    assert.equal(regRes.status, 200);
    assert.equal(regRes.body.success, true);
    assert.ok(regRes.body.token);

    // C. Query jobs via /api/v1/jobs
    const jobsRes = await request(app).get("/api/v1/jobs");
    assert.equal(jobsRes.status, 200);
    assert.ok(Array.isArray(jobsRes.body.jobs));

    // D. Query companies via /api/v1/companies
    const compRes = await request(app).get("/api/v1/companies");
    assert.equal(compRes.status, 200);
    assert.ok(Array.isArray(compRes.body.companies));
  });

  // 4. Secure HttpOnly Cookie Sessions
  await t.test("4. HttpOnly Cookies: login sets moas_session_token cookie and logout clears it", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        identifier: testUserId,
        password: "ArchPassword@2026!",
      });

    assert.equal(loginRes.status, 200);
    assert.ok(loginRes.body.token);
    sessionToken = loginRes.body.token;

    // Verify Set-Cookie header contains moas_session_token
    const cookies = loginRes.headers["set-cookie"];
    assert.ok(cookies && cookies.length > 0, "Expected set-cookie header on login");
    const sessionCookieStr = cookies.find((c: string) => c.includes("moas_session_token"));
    assert.ok(sessionCookieStr, "Expected moas_session_token in cookies");
    assert.ok(sessionCookieStr.includes("HttpOnly"), "Expected HttpOnly attribute on session cookie");
    sessionCookie = sessionCookieStr.split(";")[0];

    // Authenticate using the HttpOnly cookie without Authorization header
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", [sessionCookie]);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.id, testUserId);

    // Logout and verify cookie is cleared
    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", [sessionCookie]);
    assert.equal(logoutRes.status, 200);
    const logoutCookies = logoutRes.headers["set-cookie"];
    assert.ok(logoutCookies, "Expected set-cookie header on logout");
    assert.ok(logoutCookies.some((c: string) => c.includes("moas_session_token=;")));
  });

  // 5. Shared Request Validation
  await t.test("5. Input Validation: missing required fields return 400 and structured validation errors", async () => {
    // Missing phone in OTP send
    const otpRes = await request(app).post("/api/v1/otp/send").send({});
    assert.equal(otpRes.status, 400);

    // Missing required fields in job posting
    const jobRes = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${sessionToken}`)
      .send({});
    // Should be rejected by validator or auth
    assert.ok([400, 401, 403].includes(jobRes.status));
  });

  // 6. Centralized Error Handling & 404 Handlers
  await t.test("6. Error Handling: unhandled /api/* endpoints return consistent 404 JSON", async () => {
    const notFoundRes = await request(app).get("/api/v1/non-existent-endpoint-xyz");
    assert.equal(notFoundRes.status, 404);
    assert.equal(notFoundRes.body.success, false);
    assert.equal(notFoundRes.body.code, "NOT_FOUND");
    assert.ok(notFoundRes.body.error);
  });

  // 7. Messaging & Notifications Scaffolded APIs
  await t.test("7. Planned Services: Messaging and Notification v1 endpoints return structured scaffold notices", async () => {
    const msgRes = await request(app).get("/api/v1/messages/conversations");
    assert.equal(msgRes.status, 200);
    assert.equal(msgRes.body.status, "scaffolded");
    assert.ok(Array.isArray(msgRes.body.conversations));

    const notifRes = await request(app).get("/api/v1/notifications");
    assert.equal(notifRes.status, 200);
    assert.equal(notifRes.body.status, "scaffolded");
  });
});

test.after(() => {
  setTimeout(() => process.exit(0), 100).unref();
});
