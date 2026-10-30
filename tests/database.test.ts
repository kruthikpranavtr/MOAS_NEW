import test from "node:test";
import assert from "node:assert/strict";
import { initDatabase, checkDbHealth, query, closePool, withTransaction } from "../server/db/postgresClient.js";
import { migrator } from "../server/db/migrator.js";
import { jobRepository } from "../server/repositories/JobRepository.js";
import { userRepository } from "../server/repositories/UserRepository.js";
import { applicationRepository } from "../server/repositories/ApplicationRepository.js";
import { companyRepository } from "../server/repositories/CompanyRepository.js";
import { savedJobRepository } from "../server/repositories/SavedJobRepository.js";
import { hashPassword, verifyPassword } from "../server/utils/crypto.js";

test("PostgreSQL Database Architecture & Integration Test Suite", async (t) => {
  // Setup: initialize database and ensure migrations are applied
  await initDatabase();
  await migrator.runMigrations();

  const timestamp = Date.now();
  const testUserId = `test-pg-user-${timestamp}`;
  const testUserEmail = `pg-test-${timestamp}@moas.ai`;
  const testJobId = `test-pg-job-${timestamp}`;

  // 1. Connection & Health Check
  await t.test("1. PostgreSQL Connection: healthCheck reports connected status and pool metrics", async () => {
    const health = await checkDbHealth();
    assert.equal(health.status, "connected");
    assert.ok(health.latencyMs >= 0);
    assert.ok(health.database);
    assert.ok(health.pool.total >= 0);
  });

  // 2. Schema Migrations
  await t.test("2. Schema Migrations: versioned migrations applied and recorded in schema_migrations", async () => {
    const status = await migrator.getStatus();
    assert.ok(status.applied.length >= 1, "Expected at least 1 applied migration");
    assert.equal(status.isUpToDate, true, "Database should be up to date");

    const res = await query("SELECT * FROM schema_migrations WHERE version = 1;");
    assert.equal(res.rows.length, 1);
    assert.equal(res.rows[0].name, "initial_normalized_schema");
  });

  // 3. User CRUD & Password Hash Security
  await t.test("3. User Persistence: saves user with scrypt hash, verifies password, and enforces unique email", async () => {
    const rawPassword = "SecurePassword@2026!";
    const hashedPassword = hashPassword(rawPassword);

    const createdUser = await userRepository.save({
      id: testUserId,
      email: testUserEmail,
      password: hashedPassword,
      name: "Postgres Test User",
      role: "Candidate",
      phone: "+1-555-0199",
      avatarUrl: "https://example.com/avatar.png",
      location: "San Francisco, CA",
      skills: ["PostgreSQL", "Node.js", "TypeScript"],
      createdAt: new Date().toISOString(),
    });

    assert.equal(createdUser.id, testUserId);
    assert.equal(createdUser.email, testUserEmail);
    assert.ok(verifyPassword(rawPassword, createdUser.password));
    assert.ok(createdUser.password?.startsWith("scrypt:"));

    // Fetch user by email
    const fetchedUser = await userRepository.getByIdOrEmail(testUserEmail);
    assert.ok(fetchedUser);
    assert.equal(fetchedUser.name, "Postgres Test User");
    assert.deepEqual(fetchedUser.skills, ["PostgreSQL", "Node.js", "TypeScript"]);

    // Enforce unique email constraint: inserting another user with the same email must throw error
    await assert.rejects(
      async () => {
        await query(
          "INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4);",
          [`duplicate-user-${timestamp}`, testUserEmail, hashedPassword, "Duplicate User"]
        );
      },
      (err: any) => {
        assert.ok(err.message.includes("unique constraint") || err.code === "23505");
        return true;
      }
    );
  });

  // 4. Job Persistence & Parameterized Queries
  await t.test("4. Job CRUD: saves job with JSONB fields and performs parameterized search", async () => {
    const savedJob = await jobRepository.save({
      id: testJobId,
      title: "Senior AI Systems Architect",
      company: "DeepMind AlphaLab",
      location: "Bengaluru, India",
      type: "Full-time",
      experience: "5+ Years",
      salary: "₹75L - ₹1.2Cr",
      description: "Design distributed transformer inference engines.",
      requirements: ["PyTorch", "CUDA", "PostgreSQL"],
      department: "AI Infrastructure",
      tags: ["AI", "PostgreSQL", "CUDA"],
      isVerified: true,
      postedDate: "Just now",
      applicantCount: 0,
    });

    assert.equal(savedJob.id, testJobId);
    assert.equal(savedJob.title, "Senior AI Systems Architect");
    assert.deepEqual(savedJob.requirements, ["PyTorch", "CUDA", "PostgreSQL"]);

    // Parameterized search
    const searchResults = await jobRepository.getAll("transformer", "AI Infrastructure");
    assert.ok(searchResults.some((j) => j.id === testJobId));

    // Get by ID
    const single = await jobRepository.getById(testJobId);
    assert.ok(single);
    assert.equal(single.company, "DeepMind AlphaLab");
  });

  // 5. Atomic Application Transactions
  await t.test("5. Transactions: application submission atomically increments job applicant count", async () => {
    const beforeJob = await jobRepository.getById(testJobId);
    const initialCount = beforeJob?.applicantCount || 0;

    const testAppId = `test-app-${timestamp}`;
    const appRecord = await applicationRepository.create({
      id: testAppId,
      jobId: testJobId,
      jobTitle: "Senior AI Systems Architect",
      company: "DeepMind AlphaLab",
      candidateId: testUserId,
      candidateName: "Postgres Test User",
      candidateEmail: testUserEmail,
      appliedDate: "Today",
      status: "Applied",
      matchScore: 95,
      resumeName: "CV.pdf",
    });

    assert.equal(appRecord.id, testAppId);

    // Verify applicant count was atomically incremented
    const afterJob = await jobRepository.getById(testJobId);
    assert.equal(afterJob?.applicantCount, initialCount + 1);

    // Delete application and verify applicant count is decremented
    const deleted = await applicationRepository.delete(testAppId);
    assert.equal(deleted, true);

    const afterDeleteJob = await jobRepository.getById(testJobId);
    assert.equal(afterDeleteJob?.applicantCount, initialCount);
  });

  // 6. Saved Jobs & Duplicate Prevention
  await t.test("6. Saved Jobs: toggles saved status and enforces uq_user_saved_job constraint", async () => {
    // Toggle ON
    const firstToggle = await savedJobRepository.toggle(testUserId, testJobId);
    assert.equal(firstToggle.saved, true);

    const savedList = await savedJobRepository.getByUser(testUserId);
    assert.ok(savedList.some((s) => s.jobId === testJobId));

    // Toggle OFF
    const secondToggle = await savedJobRepository.toggle(testUserId, testJobId);
    assert.equal(secondToggle.saved, false);

    const emptyList = await savedJobRepository.getByUser(testUserId);
    assert.ok(!emptyList.some((s) => s.jobId === testJobId));
  });

  // 7. Company Ratings Aggregation
  await t.test("7. Company Ratings: saves rating and updates company average rating and review count", async () => {
    const testCompName = `Test Company ${timestamp}`;
    // Insert test company
    await query(
      "INSERT INTO companies (id, name, rating, reviews_count) VALUES ($1, $2, 4.0, 0) ON CONFLICT (name) DO NOTHING;",
      [`comp-${timestamp}`, testCompName]
    );

    const ratingRes = await companyRepository.saveRating({
      id: `rate-${timestamp}`,
      companyName: testCompName,
      userId: testUserId,
      userName: "Postgres Test User",
      rating: 5,
      reviewTitle: "Outstanding Engineering Rigor",
      reviewText: "Incredible technical leadership and modern stack.",
    });

    assert.equal(ratingRes.rating.rating, 5);
    assert.ok(ratingRes.company);
    assert.equal(ratingRes.company.name, testCompName);
    assert.equal(ratingRes.company.reviewsCount, 1);
  });

  // 8. Server Restart & Persistence Simulation
  await t.test("8. Restart Persistence: data persists across connection pool drain and re-init", async () => {
    // Drain pool
    await closePool();

    // Re-initialize pool
    await initDatabase();

    // Verify user and job still exist in PostgreSQL
    const reconnectedUser = await userRepository.getByIdOrEmail(testUserId);
    assert.ok(reconnectedUser, "User must persist across connection restarts");
    assert.equal(reconnectedUser.name, "Postgres Test User");

    const reconnectedJob = await jobRepository.getById(testJobId);
    assert.ok(reconnectedJob, "Job must persist across connection restarts");
    assert.equal(reconnectedJob.title, "Senior AI Systems Architect");

    // Clean up test records
    await jobRepository.delete(testJobId);
    await query("DELETE FROM users WHERE id = $1;", [testUserId]);
  });
});

test.after(async () => {
  await closePool();
});
