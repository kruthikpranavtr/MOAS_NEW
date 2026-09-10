# Security Specification for MOAS (ML Opportunities & Algorithmic Services)

## 1. Data Invariants
1. **User Identity & Candidate ID Immutability**: A user profile at `/users/{userId}` can only be read by signed-in users, and updated only by the account owner. The `id`, `email`, and `createdAt` fields are immutable.
2. **Application Ownership**: A job application at `/applications/{applicationId}` must have a valid `candidateId` matching the applicant, a valid `jobId`, and an authentic timestamp.
3. **Resume Integrity**: A resume at `/resumes/{resumeId}` must belong to a verified candidate, with strictly bounded file metadata and permanent ID attachment.
4. **Job Posting Integrity**: Verified jobs at `/jobs/{jobId}` can be viewed publicly or by authenticated users. Creation and modification require employer or admin authorization with strict title, salary, and requirements schemas.
5. **No Orphaned Applications or Resumes**: Applications must reference existing job IDs and candidate IDs.
6. **Strict Field Bounds**: All string fields are constrained with length checks (e.g. title <= 150, description <= 10000, name <= 100).

## 2. The "Dirty Dozen" Threat Payloads
1. **Payload 1 (Identity Hijack)**: Updating `/users/other-user-id` with another user's auth token. (Expected: `PERMISSION_DENIED`)
2. **Payload 2 (Privilege Escalation)**: Modifying `role: 'Admin'` inside `/users/{userId}` payload. (Expected: `PERMISSION_DENIED`)
3. **Payload 3 (ID Poisoning)**: Document path containing malicious special characters or >128 chars. (Expected: `PERMISSION_DENIED`)
4. **Payload 4 (Fake Timestamp Injection)**: Setting `createdAt: '2020-01-01'` instead of `request.time`. (Expected: `PERMISSION_DENIED`)
5. **Payload 5 (Oversized Payload - Denial of Wallet)**: Setting resume content or job description to >1MB malicious text. (Expected: `PERMISSION_DENIED`)
6. **Payload 6 (Shadow Field Injection)**: Adding undeclared field `__bypassAdmin: true` on user or job creation. (Expected: `PERMISSION_DENIED`)
7. **Payload 7 (Application Status Spoofing)**: Candidate updating application `status: 'Offered'` directly without employer authorization. (Expected: `PERMISSION_DENIED`)
8. **Payload 8 (Orphaned Write)**: Creating application referencing non-existent candidate ID or empty string. (Expected: `PERMISSION_DENIED`)
9. **Payload 9 (Blanket Read Bypass)**: Unauthenticated client querying all private user application histories. (Expected: `PERMISSION_DENIED`)
10. **Payload 10 (Terminal State Tampering)**: Modifying an application marked as `'Rejected'` or `'Archived'`. (Expected: `PERMISSION_DENIED`)
11. **Payload 11 (Resume Deletion by Third-Party)**: Deleting another candidate's stored CV without ownership. (Expected: `PERMISSION_DENIED`)
12. **Payload 12 (Job Salary Poisoning)**: Negative salary values or unbounded text strings in job listings. (Expected: `PERMISSION_DENIED`)

## 3. Test Runner Invariants
All operations in test suite verify zero unauthenticated writes, zero cross-user mutations, and explicit schema adherence for both create and update operations.
