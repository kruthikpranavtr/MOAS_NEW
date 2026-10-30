import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import fs from "fs";

process.env.NODE_ENV = "test";

import { initDatabase, closePool, query } from "../server/db/postgresClient.js";
import { migrator } from "../server/db/migrator.js";
import { companyRepository } from "../server/repositories/CompanyRepository.js";
import { companyMemberRepository } from "../server/repositories/CompanyMemberRepository.js";
import { userRepository } from "../server/repositories/UserRepository.js";
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

// Valid minimal PDF containing text and skills
const VALID_PDF_CONTENT = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT
/F1 12 Tf
100 700 Td
(Senior Machine Learning Engineer skilled in Python, PyTorch, React, TypeScript, Docker, and PostgreSQL) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
385
%%EOF`;
const VALID_PDF_BUFFER = Buffer.from(VALID_PDF_CONTENT, "utf-8");

// Minimal valid DOCX buffer (starts with PK\x03\x04 zip header)
const VALID_DOCX_BUFFER = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00]),
  Buffer.alloc(20, 0),
  Buffer.from("word/document.xml"),
  Buffer.from("<w:document><w:body><w:p><w:r><w:t>Data Scientist experienced in Python, TensorFlow, and AWS</w:t></w:r></w:p></w:body></w:document>"),
]);

test("MOAS Phase 7 Candidate Profile & Resume Management Test Suite", async (t) => {
  await initDatabase();
  await migrator.runMigrations();

  const timestamp = Date.now();

  // Test accounts
  const candAEmail = `cand_p7_a_${timestamp}@moas.internal`;
  const candAPassword = "CandidateA@2026!";
  let candAToken = "";
  let candAId = "";

  const candBEmail = `cand_p7_b_${timestamp}@moas.internal`;
  const candBPassword = "CandidateB@2026!";
  let candBToken = "";
  let candBId = "";

  const empAlphaEmail = `emp_p7_alpha_${timestamp}@alpha.corp`;
  const empAlphaPassword = "EmployerAlpha@2026!";
  let empAlphaToken = "";
  let empAlphaId = "";
  let compAlphaId = "";

  const empBetaEmail = `emp_p7_beta_${timestamp}@beta.corp`;
  const empBetaPassword = "EmployerBeta@2026!";
  let empBetaToken = "";
  let empBetaId = "";
  let compBetaId = "";

  let jobAlphaId = "";
  let resumeAId1 = "";
  let resumeAId2 = "";

  // 1. Setup accounts
  await t.test("1. Provision isolated test accounts for Candidate A, Candidate B, Employer Alpha, and Employer Beta", async () => {
    // Register Candidate A
    const regCandARes = await request(app)
      .post("/api/auth/register")
      .send({
        email: candAEmail,
        password: candAPassword,
        name: "Alice Candidate",
        role: "Candidate",
        phone: "+91 91234 56789",
      });
    assert.equal(regCandARes.status, 201);
    candAId = regCandARes.body.user?.id || regCandARes.body.data?.user?.id;
    candAToken = regCandARes.body.token || regCandARes.body.data?.token;
    assert.ok(candAId);
    assert.ok(candAToken);

    // Register Candidate B
    const regCandBRes = await request(app)
      .post("/api/auth/register")
      .send({
        email: candBEmail,
        password: candBPassword,
        name: "Bob Candidate",
        role: "Candidate",
        phone: "+91 91234 56790",
      });
    assert.equal(regCandBRes.status, 201);
    candBId = regCandBRes.body.user?.id || regCandBRes.body.data?.user?.id;
    candBToken = regCandBRes.body.token || regCandBRes.body.data?.token;
    assert.ok(candBId);
    assert.ok(candBToken);

    // Register Employer Alpha
    const regEmpAlphaRes = await request(app)
      .post("/api/auth/register")
      .send({
        email: empAlphaEmail,
        password: empAlphaPassword,
        name: "Alpha Recruiter",
        role: "Employer",
        companyName: `Alpha Technologies ${timestamp}`,
      });
    assert.equal(regEmpAlphaRes.status, 201);
    empAlphaId = regEmpAlphaRes.body.user?.id || regEmpAlphaRes.body.data?.user?.id;
    empAlphaToken = regEmpAlphaRes.body.token || regEmpAlphaRes.body.data?.token;
    assert.ok(empAlphaId);
    assert.ok(empAlphaToken);

    // Create Company Alpha
    const compAlpha = await companyRepository.create({
      name: `Alpha Technologies ${timestamp}`,
      ownerUserId: empAlphaId,
      verified: true,
    });
    compAlphaId = compAlpha.id;
    await companyMemberRepository.addMember({
      companyId: compAlphaId,
      userId: empAlphaId,
      role: "owner",
      isVerified: true,
    });

    // Create Job for Alpha
    const jobRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${empAlphaToken}`)
      .send({
        title: "Senior ML Engineer",
        company: `Alpha Technologies ${timestamp}`,
        companyId: compAlphaId,
        location: "Bangalore",
        employmentType: "Full Time",
        workMode: "Hybrid",
        salaryText: "$150,000",
        description: "Looking for an ML engineer with Python, PyTorch, React, Docker, and PostgreSQL expertise.",
        requirements: ["Python", "PyTorch", "Docker", "PostgreSQL"],
      });
    assert.equal(jobRes.status, 201);
    jobAlphaId = jobRes.body.job.id;

    // Register Employer Beta
    const regEmpBetaRes = await request(app)
      .post("/api/auth/register")
      .send({
        email: empBetaEmail,
        password: empBetaPassword,
        name: "Beta Recruiter",
        role: "Employer",
        companyName: `Beta Labs ${timestamp}`,
      });
    assert.equal(regEmpBetaRes.status, 201);
    empBetaId = regEmpBetaRes.body.user?.id || regEmpBetaRes.body.data?.user?.id;
    empBetaToken = regEmpBetaRes.body.token || regEmpBetaRes.body.data?.token;
    assert.ok(empBetaId);
    assert.ok(empBetaToken);

    const compBeta = await companyRepository.create({
      name: `Beta Labs ${timestamp}`,
      ownerUserId: empBetaId,
      verified: true,
    });
    compBetaId = compBeta.id;
    await companyMemberRepository.addMember({
      companyId: compBetaId,
      userId: empBetaId,
      role: "owner",
      isVerified: true,
    });
  });

  // 2. Profile Management & Candidate Profile API
  await t.test("2. Candidate Profile: Retrieve profile and verify defaults and missing sections", async () => {
    const res = await request(app)
      .get(`/api/v1/users/${candAId}/candidate-profile`)
      .set("Authorization", `Bearer ${candAToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.id, candAId);
    assert.equal(res.body.data.user.name, "Alice Candidate");
    assert.ok(typeof res.body.data.completeness.completenessScore === "number");
    assert.ok(Array.isArray(res.body.data.completeness.missingSections));
  });

  await t.test("3. Candidate Profile: Update profile details (education, skills, work experience, projects, certs)", async () => {
    const updatePayload = {
      name: "Alice M. Candidate",
      headline: "Senior Machine Learning Engineer & Systems Architect",
      bio: "Passionate AI practitioner with 6+ years deploying scalable ML models to production.",
      phone: "+91 99887 76655",
      location: "Bangalore, India",
      skills: ["Python", "PyTorch", "Docker", "PostgreSQL", "React", "TypeScript"],
      education: [
        {
          id: "edu-1",
          degree: "B.Tech in Computer Science",
          university: "National Institute of Technology",
          year: "2019",
          gpa: "8.9 / 10",
        },
      ],
      workExperience: [
        {
          id: "exp-1",
          role: "ML Engineer",
          company: "Nexus AI Labs",
          duration: "2020 - Present",
          location: "Bangalore",
          description: "Engineered scalable LLM inferencing pipelines and high-throughput vector search services.",
        },
      ],
      projects: [
        {
          id: "proj-1",
          title: "Distributed Vector Retrieval Engine",
          description: "High-performance nearest-neighbor search library in C++ and Python.",
          technologies: ["C++", "Python", "Docker"],
          link: "https://github.com/alice/vector-engine",
        },
      ],
      certifications: [
        {
          id: "cert-1",
          name: "AWS Certified Machine Learning - Specialty",
          issuer: "Amazon Web Services",
          issueDate: "2023",
        },
      ],
      preferredCategories: ["Machine Learning", "Backend Engineering"],
      preferredLocations: ["Bangalore", "Remote"],
    };

    const res = await request(app)
      .put(`/api/v1/users/${candAId}/candidate-profile`)
      .set("Authorization", `Bearer ${candAToken}`)
      .send(updatePayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.name, "Alice M. Candidate");
    assert.equal(res.body.data.user.headline, updatePayload.headline);
    assert.equal(res.body.data.user.skills.length, 6);
    assert.equal(res.body.data.user.education.length, 1);
    const profile = res.body.data.profile || res.body.data.candidateProfile;
    assert.equal(profile.workExperience.length, 1);
    assert.equal(profile.projects.length, 1);
    assert.equal(profile.certifications.length, 1);

    // Verify completeness score improved after adding skills, education, and experience
    assert.ok(res.body.data.completeness.completenessScore >= 60);
  });

  // 4. Unauthorized Profile Editing
  await t.test("4. Candidate Profile Security: Candidate B cannot modify Candidate A profile", async () => {
    const res = await request(app)
      .put(`/api/v1/users/${candAId}/candidate-profile`)
      .set("Authorization", `Bearer ${candBToken}`)
      .send({ name: "Hacked by Bob" });

    assert.equal(res.status, 403);
  });

  // 5. Resume Upload - PDF validation & storage
  await t.test("5. Secure Resume: Upload valid PDF resume with magic bytes validation", async () => {
    const res = await request(app)
      .post("/api/v1/resumes/upload")
      .set("Authorization", `Bearer ${candAToken}`)
      .attach("resume", VALID_PDF_BUFFER, "alice_ml_resume.pdf");

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.resume.name, "alice_ml_resume.pdf");
    assert.equal(res.body.data.resume.type, "PDF");
    assert.equal(res.body.data.resume.isPrimary, true); // First resume is automatically primary
    assert.ok(res.body.data.resume.id);
    resumeAId1 = res.body.data.resume.id;
  });

  // 6. Resume Upload - DOCX validation & storage
  await t.test("6. Secure Resume: Upload valid DOCX resume", async () => {
    const res = await request(app)
      .post("/api/v1/resumes/upload")
      .set("Authorization", `Bearer ${candAToken}`)
      .attach("resume", VALID_DOCX_BUFFER, "alice_cv.docx");

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.resume.name, "alice_cv.docx");
    assert.equal(res.body.data.resume.type, "DOCX");
    assert.equal(res.body.data.resume.isPrimary, false); // Second resume is not primary by default
    resumeAId2 = res.body.data.resume.id;
  });

  // 7. Invalid file rejection
  await t.test("7. Secure Resume Security: Reject fake PDF (executable/text renamed to .pdf)", async () => {
    const fakePdfBuffer = Buffer.from("<html><script>alert('malicious')</script></html>", "utf-8");
    const res = await request(app)
      .post("/api/v1/resumes/upload")
      .set("Authorization", `Bearer ${candAToken}`)
      .attach("resume", fakePdfBuffer, "fake.pdf");

    assert.equal(res.status, 400);
    const errMsg = (res.body.message || res.body.error || "").toLowerCase();
    assert.ok(errMsg.includes("invalid") || errMsg.includes("magic") || errMsg.includes("not match"));
  });

  // 8. Oversized file rejection (> 5MB)
  await t.test("8. Secure Resume Security: Reject oversized resume (> 5MB)", async () => {
    // Construct 5.1MB buffer with PDF magic bytes
    const oversizedBuffer = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.alloc(5.2 * 1024 * 1024, 0x20),
    ]);

    const res = await request(app)
      .post("/api/v1/resumes/upload")
      .set("Authorization", `Bearer ${candAToken}`)
      .attach("resume", oversizedBuffer, "large_resume.pdf");

    assert.equal(res.status, 400);
    assert.ok(res.body.message.includes("exceeds") || res.body.message.includes("5MB") || res.body.message.includes("limit"));
  });

  // 9. Single Primary Resume Constraint & Selection
  await t.test("9. Primary Resume: Set second resume as primary and verify previous is demoted", async () => {
    const res = await request(app)
      .patch(`/api/v1/resumes/${resumeAId2}/primary`)
      .set("Authorization", `Bearer ${candAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.resume.id, resumeAId2);
    assert.equal(res.body.data.resume.isPrimary, true);

    // Verify list: only one primary resume exists
    const listRes = await request(app)
      .get("/api/v1/resumes")
      .set("Authorization", `Bearer ${candAToken}`);

    assert.equal(listRes.status, 200);
    const resumes = listRes.body.data.resumes;
    assert.equal(resumes.length, 2);
    const primaryResumes = resumes.filter((r: any) => r.isPrimary);
    assert.equal(primaryResumes.length, 1);
    assert.equal(primaryResumes[0].id, resumeAId2);
  });

  // 10. Streaming Download
  await t.test("10. Secure Resume: Download own resume stream and verify headers and contents", async () => {
    const res = await request(app)
      .get(`/api/v1/resumes/${resumeAId1}/download`)
      .set("Authorization", `Bearer ${candAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.headers["content-type"], "application/pdf");
    assert.ok(res.headers["content-disposition"].includes("attachment"));
    assert.ok(res.headers["content-disposition"].includes("alice_ml_resume.pdf"));
    assert.ok(res.body.length > 0 || res.text.includes("%PDF-1.4"));
  });

  // 11. Unauthorized Cross-Candidate Download
  await t.test("11. Resume Security: Candidate B is denied downloading Candidate A's resume (403)", async () => {
    const res = await request(app)
      .get(`/api/v1/resumes/${resumeAId1}/download`)
      .set("Authorization", `Bearer ${candBToken}`);

    assert.equal(res.status, 403);
  });

  // 12. Employer Authorization: Legitimate Application vs Unauthorized
  await t.test("12. Employer Resume Access: Employer Beta denied viewing Candidate A resume without application", async () => {
    const res = await request(app)
      .get(`/api/v1/resumes/${resumeAId1}/download`)
      .set("Authorization", `Bearer ${empBetaToken}`);

    assert.equal(res.status, 403);
  });

  await t.test("13. Employer Resume Access: Employer Alpha can view Candidate A resume after legitimate application", async () => {
    // Alice applies to Alpha's job
    const applyRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        jobId: jobAlphaId,
        jobTitle: "Senior ML Engineer",
        company: `Alpha Technologies ${timestamp}`,
        candidateId: candAId,
        candidateName: "Alice M. Candidate",
        candidateEmail: candAEmail,
        resumeName: "alice_ml_resume.pdf",
      });
    assert.ok(applyRes.status === 200 || applyRes.status === 201);

    // Employer Alpha can now download Alice's resume
    const dlRes = await request(app)
      .get(`/api/v1/resumes/${resumeAId1}/download`)
      .set("Authorization", `Bearer ${empAlphaToken}`);

    assert.equal(dlRes.status, 200);
    assert.equal(dlRes.headers["content-type"], "application/pdf");
  });

  // 14. Profile Photo Management
  await t.test("14. Profile Photo: Upload valid PNG photo and verify storage URL and completeness score", async () => {
    const res = await request(app)
      .post("/api/v1/users/photo")
      .set("Authorization", `Bearer ${candAToken}`)
      .attach("photo", VALID_PNG_BUFFER, "alice_avatar.png");

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.avatarUrl.includes(`/api/v1/users/${candAId}/photo`));
    assert.ok(res.body.data.completeness.completenessScore >= 80);
  });

  await t.test("15. Profile Photo: Retrieve served photo and verify Content-Type", async () => {
    const res = await request(app).get(`/api/v1/users/${candAId}/photo`);
    assert.equal(res.status, 200);
    assert.equal(res.headers["content-type"], "image/png");
    assert.ok(res.body.length > 0);
  });

  await t.test("16. Profile Photo: Remove photo resets avatar to default initials URL", async () => {
    const res = await request(app)
      .delete("/api/v1/users/photo")
      .set("Authorization", `Bearer ${candAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.user.avatarUrl.includes("ui-avatars.com"));
  });

  // 17. AI Resume Analysis
  await t.test("17. AI Resume Analysis: Extract skills and match against job requirements", async () => {
    const res = await request(app)
      .post(`/api/v1/resumes/${resumeAId1}/analyze`)
      .set("Authorization", `Bearer ${candAToken}`)
      .send({
        jobRequirements: ["Python", "PyTorch", "Kubernetes", "PostgreSQL"],
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const scoreVal = res.body.data?.matchScore ?? res.body.data?.score ?? res.body.matchScore ?? res.body.score;
    assert.ok(typeof scoreVal === "number");
    const extractedSkills = res.body.data?.extractedSkills || res.body.extractedSkills;
    assert.ok(Array.isArray(extractedSkills));
    assert.ok(extractedSkills.includes("Python") || extractedSkills.includes("PyTorch"));
    assert.ok(Array.isArray(res.body.data.missingSkills));
    assert.ok(Array.isArray(res.body.data.recommendations));
  });

  // 18. Resume Deletion & Primary Reassignment
  await t.test("18. Resume Deletion: Delete primary resume and verify remaining resume becomes primary", async () => {
    const res = await request(app)
      .delete(`/api/v1/resumes/${resumeAId2}`)
      .set("Authorization", `Bearer ${candAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // List remaining resumes
    const listRes = await request(app)
      .get("/api/v1/resumes")
      .set("Authorization", `Bearer ${candAToken}`);

    assert.equal(listRes.status, 200);
    const resumes = listRes.body.data.resumes;
    assert.equal(resumes.length, 1);
    assert.equal(resumes[0].id, resumeAId1);
    assert.equal(resumes[0].isPrimary, true); // Automatically promoted to primary
  });

  // 19. Persistence Across DB Pool Restart
  await t.test("19. Persistence Integrity: Profile details, skills, and resume metadata persist across pool restart", async () => {
    await closePool();
    await initDatabase();

    const res = await request(app)
      .get(`/api/v1/users/${candAId}/candidate-profile`)
      .set("Authorization", `Bearer ${candAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.name, "Alice M. Candidate");
    assert.ok(res.body.data.user.skills.length >= 6);
    assert.ok(res.body.data.user.skills.includes("Python"));
    assert.ok(res.body.data.user.skills.includes("PyTorch"));
    const profile = res.body.data.profile || res.body.data.candidateProfile;
    assert.equal(profile.workExperience.length, 1);
    const resumes = res.body.data.user?.resumes || res.body.data.resumes || [];
    assert.equal(resumes.length, 1);
    assert.equal(resumes[0].name, "alice_ml_resume.pdf");
    assert.equal(resumes[0].isPrimary, true);
  });

  await closePool();
});
