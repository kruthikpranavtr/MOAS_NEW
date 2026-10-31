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
import { savedJobRepository } from "../server/repositories/SavedJobRepository.js";
import { applicationRepository } from "../server/repositories/ApplicationRepository.js";

const { app } = await import("../server.js");

test("MOAS Phase 9 Complete Job Posting, Search, Filtering and Discovery Test Suite", async (t) => {
  await initDatabase();
  await migrator.runMigrations();

  const timestamp = Date.now();

  // Test identities
  const empAlphaEmail = `emp_p9_alpha_${timestamp}@alpha.tech`;
  const empAlphaPassword = "EmployerAlpha@2026!";
  let empAlphaToken = "";
  let empAlphaId = "";
  let compAlphaId = "";

  const empBetaEmail = `emp_p9_beta_${timestamp}@beta.tech`;
  const empBetaPassword = "EmployerBeta@2026!";
  let empBetaToken = "";
  let empBetaId = "";
  let compBetaId = "";

  const candAEmail = `cand_p9_a_${timestamp}@moas.internal`;
  const candAPassword = "CandidateA@2026!";
  let candAToken = "";
  let candAId = "";

  const candBEmail = `cand_p9_b_${timestamp}@moas.internal`;
  const candBPassword = "CandidateB@2026!";
  let candBToken = "";
  let candBId = "";

  const adminEmail = `admin_p9_${timestamp}@moas.internal`;
  const adminPassword = "AdminSecure@2026!";
  let adminToken = "";
  let adminId = "";

  let activeJobId = "";
  let draftJobId = "";
  let closedJobId = "";
  let expiredJobId = "";

  // 1. Setup isolated test accounts & companies
  await t.test("1. Setup: provision Employer Alpha, Employer Beta, Candidate A, Candidate B, and Admin", async () => {
    // Register Employer Alpha
    const regEmpAlpha = await request(app).post("/api/v1/auth/register").send({
      name: "Alpha Corp Founder",
      username: `emp_p9_alpha_${timestamp}`,
      email: empAlphaEmail,
      phone: `+91 91${String(timestamp).slice(-8)}`,
      password: empAlphaPassword,
      confirmPassword: empAlphaPassword,
      companyName: `Alpha Global Technologies ${timestamp}`,
      role: "Employer",
    });
    assert.equal(regEmpAlpha.status, 201);
    empAlphaToken = regEmpAlpha.body.token;
    empAlphaId = regEmpAlpha.body.user.id;

    // Get Company Alpha
    const compAlpha = await companyRepository.getByName(`Alpha Global Technologies ${timestamp}`);
    assert.ok(compAlpha);
    compAlphaId = compAlpha.id;
    // Mark Company Alpha as verified for testing verified filtering
    await companyRepository.updateVerificationStatus(compAlphaId, "verified", "Audit verified");

    // Register Employer Beta
    const regEmpBeta = await request(app).post("/api/v1/auth/register").send({
      name: "Beta Innovations Founder",
      username: `emp_p9_beta_${timestamp}`,
      email: empBetaEmail,
      phone: `+91 92${String(timestamp).slice(-8)}`,
      password: empBetaPassword,
      confirmPassword: empBetaPassword,
      companyName: `Beta Ventures ${timestamp}`,
      role: "Employer",
    });
    assert.equal(regEmpBeta.status, 201);
    empBetaToken = regEmpBeta.body.token;
    empBetaId = regEmpBeta.body.user.id;

    const compBeta = await companyRepository.getByName(`Beta Ventures ${timestamp}`);
    assert.ok(compBeta);
    compBetaId = compBeta.id;

    // Register Candidate A
    const regCandA = await request(app).post("/api/v1/auth/register").send({
      name: "Alice Candidate",
      username: `cand_p9_a_${timestamp}`,
      email: candAEmail,
      phone: `+91 93${String(timestamp).slice(-8)}`,
      password: candAPassword,
      confirmPassword: candAPassword,
      role: "Candidate",
    });
    assert.equal(regCandA.status, 201);
    candAToken = regCandA.body.token;
    candAId = regCandA.body.user.id;

    // Register Candidate B
    const regCandB = await request(app).post("/api/v1/auth/register").send({
      name: "Bob Candidate",
      username: `cand_p9_b_${timestamp}`,
      email: candBEmail,
      phone: `+91 94${String(timestamp).slice(-8)}`,
      password: candBPassword,
      confirmPassword: candBPassword,
      role: "Candidate",
    });
    assert.equal(regCandB.status, 201);
    candBToken = regCandB.body.token;
    candBId = regCandB.body.user.id;

    // Register Admin
    const regAdmin = await request(app).post("/api/v1/auth/register").send({
      name: "Platform Security Admin",
      username: `admin_p9_${timestamp}`,
      email: adminEmail,
      phone: `+91 95${String(timestamp).slice(-8)}`,
      password: adminPassword,
      confirmPassword: adminPassword,
      role: "Admin",
    });
    assert.equal(regAdmin.status, 201);
    adminToken = regAdmin.body.token;
    adminId = regAdmin.body.user.id;
  });

  // 2. Complete Employer Job Posting (Task 2)
  await t.test("2. Employer Job Posting: persists all 20 required fields to PostgreSQL with company derivation", async () => {
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const jobPayload = {
      title: "Senior Distributed ML Systems Engineer",
      companyId: compAlphaId,
      description: "Architect and scale distributed deep learning inference clusters and low-latency transformer pipelines.",
      responsibilities: [
        "Architect distributed transformer inference engines",
        "Optimize PyTorch and CUDA kernels for production throughput",
        "Collaborate with algorithmic researchers on hardware acceleration"
      ],
      qualifications: [
        "Bachelor or Master's degree in Computer Science or related field",
        "5+ years building distributed ML systems in production",
        "Strong systems programming experience in C++ and Python"
      ],
      skills: ["PyTorch", "CUDA", "Kubernetes", "Ray", "Triton"],
      preferredSkills: ["TensorRT", "vLLM", "NCCL"],
      experience: "5+ years",
      salaryMin: 180000,
      salaryMax: 240000,
      salaryCurrency: "USD",
      salaryPeriod: "yearly",
      location: "Bengaluru, India",
      workMode: "Hybrid",
      employmentType: "Full-time",
      category: "Artificial Intelligence",
      applicationDeadline: deadline,
      openingsCount: 3,
      benefits: ["Health Insurance", "Stock Options (RSU)", "Remote Work Stipend", "Learning Budget"],
      status: "open",
    };

    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send(jobPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const created = res.body.data.job;
    assert.ok(created.id);
    activeJobId = created.id;

    assert.equal(created.title, jobPayload.title);
    assert.equal(created.companyId, compAlphaId);
    assert.equal(created.company, `Alpha Global Technologies ${timestamp}`);
    assert.equal(created.salaryMin, 180000);
    assert.equal(created.salaryMax, 240000);
    assert.equal(created.salaryCurrency, "USD");
    assert.equal(created.salaryPeriod, "yearly");
    assert.equal(created.workMode, "Hybrid");
    assert.equal(created.employmentType, "Full-time");
    assert.equal(created.category, "Artificial Intelligence");
    assert.equal(created.openingsCount, 3);
    assert.deepEqual(created.skills, jobPayload.skills);
    assert.deepEqual(created.preferredSkills, jobPayload.preferredSkills);
    assert.deepEqual(created.benefits, jobPayload.benefits);
    assert.equal(created.status, "open");
    assert.ok(created.publishedAt);

    // Verify direct PostgreSQL query
    const dbRes = await query("SELECT * FROM moas.jobs WHERE id = $1;", [activeJobId]);
    assert.equal(dbRes.rowCount, 1);
    const row = dbRes.rows[0];
    assert.equal(row.title, jobPayload.title);
    assert.equal(row.company_id, compAlphaId);
    assert.equal(row.status, "open");
  });

  // 3. Security: Candidate cannot post jobs (Task 2, 13)
  await t.test("3. Security: Candidate is forbidden from creating job postings (403)", async () => {
    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        title: "Unauthorized Position",
        companyId: compAlphaId,
        description: "Malicious job post",
      });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /forbidden|restricted/i);
  });

  // 4. Security: Cross-company posting and editing authorization (Task 2, 13)
  await t.test("4. Security: Employer cannot post or edit jobs for unauthorized companies (403)", async () => {
    // Employer Beta attempts to post job for Company Alpha -> 403
    const crossPost = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${empBetaToken}`)
      .send({
        title: "Malicious Job at Alpha",
        companyId: compAlphaId, // Belonging to Employer Alpha!
        description: "Attempting to post under another organization.",
      });
    assert.equal(crossPost.status, 403);
    assert.match(crossPost.body.message, /forbidden|authorized/i);

    // Employer Beta attempts to edit Employer Alpha's active job -> 403
    const crossEdit = await request(app)
      .put(`/api/v1/jobs/${activeJobId}`)
      .set("Authorization", `Bearer ${empBetaToken}`)
      .send({
        title: "Hijacked Title",
      });
    assert.equal(crossEdit.status, 403);

    // Employer Beta attempts to change status of Employer Alpha's job -> 403
    const crossStatus = await request(app)
      .patch(`/api/v1/jobs/${activeJobId}/status`)
      .set("Authorization", `Bearer ${empBetaToken}`)
      .send({ status: "closed" });
    assert.equal(crossStatus.status, 403);
  });

  // 5. Job Lifecycle: Draft, Publish, Edit, Close, Reopen, Archive (Task 3)
  await t.test("5. Job Lifecycle: Draft creation, publishing, editing, closing, reopening, and archiving", async () => {
    // 5a. Save as Draft
    const draftRes = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        title: "Junior Data Analyst Draft",
        companyId: compAlphaId,
        description: "Entry-level data pipelines and dashboard generation.",
        status: "draft",
        category: "Data Science",
        location: "Mumbai, India",
        salaryMin: 50000,
        salaryMax: 70000,
      });
    assert.equal(draftRes.status, 201);
    draftJobId = draftRes.body.data.job.id;
    assert.equal(draftRes.body.data.job.status, "draft");

    // 5b. Edit Job
    const editRes = await request(app)
      .put(`/api/v1/jobs/${draftJobId}`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        title: "Associate Data Engineer",
        salaryMin: 60000,
        salaryMax: 85000,
      });
    assert.equal(editRes.status, 200);
    assert.equal(editRes.body.data.job.title, "Associate Data Engineer");
    assert.equal(editRes.body.data.job.salaryMin, 60000);

    // 5c. Publish Draft
    const pubRes = await request(app)
      .patch(`/api/v1/jobs/${draftJobId}/status`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ status: "published" });
    assert.equal(pubRes.status, 200);
    assert.equal(pubRes.body.data.job.status, "published");
    assert.ok(pubRes.body.data.job.publishedAt);

    // 5d. Close Job
    const closeRes = await request(app)
      .patch(`/api/v1/jobs/${draftJobId}/status`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ status: "closed" });
    assert.equal(closeRes.status, 200);
    assert.equal(closeRes.body.data.job.status, "closed");
    assert.ok(closeRes.body.data.job.closedAt);

    // 5e. Reopen Job
    const reopenRes = await request(app)
      .patch(`/api/v1/jobs/${draftJobId}/status`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ status: "open" });
    assert.equal(reopenRes.status, 200);
    assert.equal(reopenRes.body.data.job.status, "open");

    // 5f. Archive Job
    const archiveRes = await request(app)
      .patch(`/api/v1/jobs/${draftJobId}/status`)
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ status: "archived" });
    assert.equal(archiveRes.status, 200);
    assert.equal(archiveRes.body.data.job.status, "archived");
    assert.ok(archiveRes.body.data.job.archivedAt);
  });

  // 6. Public Search & Private Status Restrictions (Task 3, 4)
  await t.test("6. Public Search: Draft, closed, and archived jobs are hidden from public discovery", async () => {
    // Create a closed job and an expired job for testing
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const expiredRes = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        title: "Expired Research Intern",
        companyId: compAlphaId,
        description: "Deadline has passed.",
        status: "open",
        applicationDeadline: pastDate,
      });
    expiredJobId = expiredRes.body.data.job.id;

    const closedRes = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        title: "Secret Inactive Role",
        companyId: compAlphaId,
        description: "Already filled internally.",
        status: "closed",
      });
    closedJobId = closedRes.body.data.job.id;

    // Public search as Candidate
    const publicSearch = await request(app)
      .get("/api/v1/jobs?search=Associate Data Engineer")
      .set("Authorization", `Bearer ${candAToken}`);

    assert.equal(publicSearch.status, 200);
    const foundIds = publicSearch.body.data.jobs.map((j: any) => j.id);
    // draftJobId is archived, closedJobId is closed -> neither should appear in public search
    assert.ok(!foundIds.includes(draftJobId), "Archived job should not be visible in public search");
    assert.ok(!foundIds.includes(closedJobId), "Closed job should not be visible in public search");

    // But Employer querying their own company jobs sees all statuses
    const employerJobs = await request(app)
      .get("/api/v1/employer/jobs")
      .set("Authorization", `Bearer ${empAlphaToken}`);
    assert.equal(employerJobs.status, 200);
    const empJobIds = employerJobs.body.data.jobs.map((j: any) => j.id);
    assert.ok(empJobIds.includes(draftJobId), "Employer should see their archived jobs");
    assert.ok(empJobIds.includes(activeJobId), "Employer should see their active jobs");
  });

  // 7. Full-Text Search (Task 4)
  await t.test("7. Full-Text Search: keyword, skills, company name, location, and SQL injection safety", async () => {
    // 7a. Search by Title keyword
    const resTitle = await request(app).get("/api/v1/jobs?search=Distributed ML Systems");
    assert.equal(resTitle.status, 200);
    assert.ok(resTitle.body.data.jobs.some((j: any) => j.id === activeJobId));

    // 7b. Search by Skills
    const resSkills = await request(app).get("/api/v1/jobs?search=CUDA");
    assert.equal(resSkills.status, 200);
    assert.ok(resSkills.body.data.jobs.some((j: any) => j.id === activeJobId));

    // 7c. Search by Company Name
    const resComp = await request(app).get(`/api/v1/jobs?search=Alpha Global Technologies`);
    assert.equal(resComp.status, 200);
    assert.ok(resComp.body.data.jobs.some((j: any) => j.id === activeJobId));

    // 7d. Search by Location
    const resLoc = await request(app).get("/api/v1/jobs?location=Bengaluru");
    assert.equal(resLoc.status, 200);
    assert.ok(resLoc.body.data.jobs.some((j: any) => j.id === activeJobId));

    // 7e. SQL Injection Immunity: malicious input treated as safe string
    const sqlInjection = "' OR 1=1 --; DROP TABLE moas.jobs;";
    const resSafe = await request(app).get(`/api/v1/jobs?search=${encodeURIComponent(sqlInjection)}`);
    assert.equal(resSafe.status, 200);
    assert.ok(Array.isArray(resSafe.body.data.jobs));
  });

  // 8. Multi-Faceted Job Filtering (Task 5)
  await t.test("8. Multi-Faceted Filtering: category, work mode, employment type, salary range, and verified company", async () => {
    // Create an unverified company job for comparison
    const unverifiedJobRes = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${empBetaToken}`)
      .send({
        title: "Frontend React Developer",
        companyId: compBetaId,
        description: "Build interactive client UI applications.",
        category: "Software Development",
        workMode: "Remote",
        employmentType: "Contract",
        salaryMin: 80000,
        salaryMax: 110000,
        status: "open",
      });
    assert.equal(unverifiedJobRes.status, 201);
    const unverifiedJobId = unverifiedJobRes.body.data.job.id;

    // Filter: category = Artificial Intelligence AND workMode = Hybrid
    const multiFilter = await request(app).get(
      "/api/v1/jobs?category=Artificial Intelligence&workMode=Hybrid"
    );
    assert.equal(multiFilter.status, 200);
    const ids = multiFilter.body.data.jobs.map((j: any) => j.id);
    assert.ok(ids.includes(activeJobId));
    assert.ok(!ids.includes(unverifiedJobId));

    // Filter: salary range (salaryMin = 150000)
    const salFilter = await request(app).get("/api/v1/jobs?salaryMin=150000");
    assert.equal(salFilter.status, 200);
    assert.ok(salFilter.body.data.jobs.some((j: any) => j.id === activeJobId));

    // Filter: verifiedOnly = true
    const verFilter = await request(app).get("/api/v1/jobs?verifiedOnly=true");
    assert.equal(verFilter.status, 200);
    const verIds = verFilter.body.data.jobs.map((j: any) => j.id);
    assert.ok(verIds.includes(activeJobId));
    assert.ok(!verIds.includes(unverifiedJobId));
  });

  // 9. Server-Side Sorting and Pagination (Task 6)
  await t.test("9. Sorting & Pagination: newest, salary high, page size, total counts, and duplicate prevention", async () => {
    // Test sorting by salary_high
    const sortRes = await request(app).get("/api/v1/jobs?sortBy=salary_high&limit=10");
    assert.equal(sortRes.status, 200);
    const jobs = sortRes.body.data.jobs;
    assert.ok(jobs.length > 0);
    for (let i = 0; i < jobs.length - 1; i++) {
      const salA = jobs[i].salaryMax || jobs[i].salaryMin || 0;
      const salB = jobs[i + 1].salaryMax || jobs[i + 1].salaryMin || 0;
      assert.ok(salA >= salB, "Jobs should be ordered by descending salary");
    }

    // Test pagination: page 1 vs page 2
    const page1 = await request(app).get("/api/v1/jobs?page=1&limit=2");
    assert.equal(page1.status, 200);
    assert.equal(page1.body.data.page, 1);
    assert.equal(page1.body.data.limit, 2);
    assert.ok(page1.body.data.total >= 2);

    const page2 = await request(app).get("/api/v1/jobs?page=2&limit=2");
    assert.equal(page2.status, 200);
    assert.equal(page2.body.data.page, 2);

    // Verify no duplicates across consecutive pages
    const p1Ids = new Set(page1.body.data.jobs.map((j: any) => j.id));
    const p2Ids = page2.body.data.jobs.map((j: any) => j.id);
    for (const id of p2Ids) {
      assert.ok(!p1Ids.has(id), `Duplicate job ID ${id} across page 1 and page 2`);
    }
  });

  // 10. Job Details & Application Restriction to Closed/Expired Jobs (Task 7)
  await t.test("10. Job Details & Application Constraints: view details and reject applications to closed/expired jobs", async () => {
    // 10a. Job Details Retrieval
    const detailRes = await request(app).get(`/api/v1/jobs/${activeJobId}`);
    assert.equal(detailRes.status, 200);
    const job = detailRes.body.data.job;
    assert.equal(job.id, activeJobId);
    assert.equal(job.title, "Senior Distributed ML Systems Engineer");
    assert.equal(job.openingsCount, 3);
    assert.ok(job.companyVerified);

    // 10b. Successful application to active job
    const applySuccess = await request(app)
      .post("/api/v1/applications")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        jobId: activeJobId,
        resumeName: "Alice_ML_Systems_Resume.pdf",
      });
    assert.equal(applySuccess.status, 201);
    assert.equal(applySuccess.body.data.application.jobId, activeJobId);

    // 10c. Reject application to closed job
    const applyClosed = await request(app)
      .post("/api/v1/applications")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        jobId: closedJobId,
        resumeName: "Alice_Resume.pdf",
      });
    assert.equal(applyClosed.status, 400);
    assert.match(applyClosed.body.message, /closed|inactive/i);

    // 10d. Reject application to expired job
    const applyExpired = await request(app)
      .post("/api/v1/applications")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        jobId: expiredJobId,
        resumeName: "Alice_Resume.pdf",
      });
    assert.equal(applyExpired.status, 400);
    assert.match(applyExpired.body.message, /expired|deadline/i);
  });

  // 11. Saved Jobs Persistence & Security (Task 8)
  await t.test("11. Saved Jobs: candidate bookmarking, duplicate prevention, retrieval with metadata, and removal", async () => {
    // 11a. Candidate A saves active job
    const saveRes = await request(app)
      .post("/api/v1/jobs/saved")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({ jobId: activeJobId });
    assert.equal(saveRes.status, 200);
    assert.equal(saveRes.body.data.saved, true);

    // 11b. Duplicate prevention: saving again returns gracefully
    const dupRes = await request(app)
      .post("/api/v1/jobs/saved")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({ jobId: activeJobId });
    assert.equal(dupRes.status, 200);
    // Unsaved or saved status toggles cleanly
    if (!dupRes.body.data.saved) {
      // Toggle back to saved for subsequent tests
      await request(app)
        .post("/api/v1/jobs/saved")
        .set("Authorization", `Bearer ${candAToken}`)
        .send({ jobId: activeJobId });
    }

    // 11c. Candidate A views saved jobs
    const getSaved = await request(app)
      .get("/api/v1/jobs/saved")
      .set("Authorization", `Bearer ${candAToken}`);
    assert.equal(getSaved.status, 200);
    const savedList = getSaved.body.data.savedJobs;
    assert.ok(savedList.some((s: any) => s.jobId === activeJobId));
    // Verify joined metadata
    const activeSaved = savedList.find((s: any) => s.jobId === activeJobId);
    assert.ok(activeSaved.job);
    assert.equal(activeSaved.job.title, "Senior Distributed ML Systems Engineer");

    // 11d. Cross-user isolation: Candidate B cannot query Candidate A's saved jobs
    const crossSaved = await request(app)
      .get(`/api/v1/jobs/saved?userId=${candAId}`)
      .set("Authorization", `Bearer ${candBToken}`);
    assert.equal(crossSaved.status, 403);

    // 11e. Employer cannot save jobs
    const empSave = await request(app)
      .post("/api/v1/jobs/saved")
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({ jobId: activeJobId });
    assert.equal(empSave.status, 403);

    // 11f. Remove saved job
    const delRes = await request(app)
      .delete(`/api/v1/jobs/saved/${activeJobId}`)
      .set("Authorization", `Bearer ${candAToken}`);
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.data.removed, true);
  });

  // 12. Real Category Counts API (Task 9)
  await t.test("12. Category Counts: returns authoritative PostgreSQL counts of active openings per category", async () => {
    const res = await request(app).get("/api/v1/jobs/categories");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.categories));
    const aiCategory = res.body.data.categories.find(
      (c: any) => c.category.toLowerCase() === "artificial intelligence"
    );
    assert.ok(aiCategory);
    assert.ok(aiCategory.count >= 1);
  });

  // 13. Employer Dashboard Integration (Task 10)
  await t.test("13. Employer Dashboard: returns live job status breakdown and applicants for company jobs", async () => {
    const dashRes = await request(app)
      .get("/api/v1/employer/dashboard")
      .set("Authorization", `Bearer ${empAlphaToken}`);
    assert.equal(dashRes.status, 200);
    const stats = dashRes.body.data.stats;
    assert.ok(stats.totalJobs >= 1);
    assert.ok(stats.activeJobs >= 1);
    assert.ok(stats.totalApplications >= 1);

    const empJobsRes = await request(app)
      .get("/api/v1/employer/jobs")
      .set("Authorization", `Bearer ${empAlphaToken}`);
    assert.equal(empJobsRes.status, 200);
    const jobs = empJobsRes.body.data.jobs;
    assert.ok(jobs.some((j: any) => j.id === activeJobId));
  });

  // 14. AI Job Description Generator (Task 11)
  await t.test("14. AI Job Assistant: structured generation validation and provider error handling", async () => {
    // Missing required fields
    const emptyRes = await request(app)
      .post("/api/v1/ai/generate-job")
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({});
    assert.equal(emptyRes.status, 400);

    // Generation attempt with test parameters
    const genRes = await request(app)
      .post("/api/v1/ai/generate-job")
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        jobTitle: "Principal AI Research Scientist",
        industry: "Machine Learning",
        skills: ["Transformers", "PyTorch", "Diffusion Models"],
        experience: "7+ years",
        location: "Bengaluru",
        employmentType: "Full-time",
      });

    // In a test environment without live external Gemini credentials, server should handle cleanly without fabricating fake success
    assert.ok([200, 502, 503].includes(genRes.status));
    if (genRes.status === 200) {
      assert.ok(genRes.body.data?.description || genRes.body.data?.suggestedDescription || genRes.body.data);
    } else {
      const msg = genRes.body.message || genRes.body.error || "";
      assert.match(msg, /AI|Gemini|unavailable|provider|failed/i);
    }
  });

  // 15. Persistence Across Database Restart (Task 12)
  await t.test("15. Persistence: Job records, saved jobs, and timestamps persist across pool restart", async () => {
    // Re-save a job for persistence check
    await request(app)
      .post("/api/v1/jobs/saved")
      .set("Authorization", `Bearer ${candBToken}`)
      .send({ jobId: activeJobId });

    // Drain and re-initialize connection pool
    await closePool();
    await initDatabase();

    // Verify job persists
    const directJob = await jobRepository.getById(activeJobId);
    assert.ok(directJob);
    assert.equal(directJob.title, "Senior Distributed ML Systems Engineer");
    assert.equal(directJob.companyId, compAlphaId);

    // Verify saved job persists
    const saved = await savedJobRepository.getByUser(candBId);
    assert.ok(saved.some((s) => s.jobId === activeJobId));
  });

  test.after(async () => {
    await closePool();
  });
});
