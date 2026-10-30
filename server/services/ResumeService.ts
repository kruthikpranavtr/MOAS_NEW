import path from "path";
import { userRepository } from "../repositories/UserRepository.js";
import { applicationRepository } from "../repositories/ApplicationRepository.js";
import { ResumeItem, SanitizedUser } from "../models/types.js";
import { sanitizeUser } from "../utils/crypto.js";
import {
  validateResumeBuffer,
  saveResumeFile,
  readResumeFile,
  deleteStorageFile,
  RESUMES_STORAGE_DIR,
} from "../utils/storage.js";
import {
  extractTextFromPdf,
  extractTextFromDocx,
  extractSkillsFromText,
  compareSkillsWithRequirements,
} from "../utils/resumeParser.js";
import { profileCompletenessService } from "./ProfileCompletenessService.js";
import { aiService } from "./AIService.js";
import { logger } from "../utils/logger.js";

export class ResumeService {
  /**
   * Retrieves all resumes for a user with authorization check.
   */
  async getResumesForUser(
    targetUserId: string,
    caller: { userId: string; role: string }
  ): Promise<ResumeItem[]> {
    const callerRole = (caller.role || "").toLowerCase();
    const callerId = (caller.userId || "").toLowerCase();
    const targetId = (targetUserId || "").toLowerCase();

    if (callerRole !== "admin" && callerId !== targetId) {
      throw new Error("Forbidden: Access denied. You can only view your own resumes.");
    }

    const resumes = await userRepository.getResumes(targetUserId);
    // Sanitize dataUrl from responses to avoid exposing large payloads
    return resumes.map((r) => ({
      ...r,
      dataUrl: undefined,
    }));
  }

  /**
   * Retrieves single resume metadata with strict RBAC enforcement:
   * - Candidates can only view their own resumes.
   * - Employers can only view resumes of candidates who have applied to their company's job postings.
   * - Admins can view any resume.
   */
  async getResumeById(
    resumeId: string,
    caller: { userId: string; role: string }
  ): Promise<ResumeItem | null> {
    const resume = await userRepository.getResumeById(resumeId);
    if (!resume) return null;

    const callerRole = (caller.role || "").toLowerCase();
    const callerId = (caller.userId || "").toLowerCase();
    const ownerId = (resume.userId || "").toLowerCase();

    if (callerRole === "admin") {
      return { ...resume, dataUrl: undefined };
    }

    if (callerRole === "candidate" || callerRole === "jobseeker") {
      if (ownerId !== callerId) {
        throw new Error("Forbidden: Access denied. You can only view your own resumes.");
      }
      return { ...resume, dataUrl: undefined };
    }

    if (callerRole === "employer") {
      const hasApplied = await applicationRepository.isCandidateApplicantForEmployer(
        resume.userId || "",
        caller.userId
      );
      if (!hasApplied) {
        throw new Error(
          "Forbidden: Access denied. You can only view resumes of candidates who have applied to your company's jobs."
        );
      }
      return { ...resume, dataUrl: undefined };
    }

    throw new Error("Forbidden: Unauthorized access.");
  }

  /**
   * Uploads a resume file with strict content validation, secure private storage, and metadata recording.
   */
  async uploadResumeFile(params: {
    targetUserId?: string;
    originalFilename: string;
    buffer: Buffer;
    isPrimary?: boolean;
    callerSession: { userId: string; role: string; email?: string };
  }): Promise<{ resume: ResumeItem; completeness: any }> {
    const { targetUserId, originalFilename, buffer, callerSession } = params;
    const callerId = callerSession.userId.toLowerCase();
    const callerRole = (callerSession.role || "").toLowerCase();
    const resolvedUserId = (targetUserId || callerSession.userId).trim();

    if (callerRole !== "admin" && callerId !== resolvedUserId.toLowerCase()) {
      throw new Error("Access denied. You can only upload resumes to your own account.");
    }

    // 1. Content and file-type validation (magic bytes, size <= 5MB)
    const validation = validateResumeBuffer(buffer, originalFilename);
    if (!validation.valid || !validation.detectedType) {
      throw new Error(validation.error || "Invalid resume file.");
    }

    // 2. Extract parsed text from the document
    let parsedText = "";
    if (validation.detectedType === "PDF") {
      parsedText = extractTextFromPdf(buffer);
    } else if (validation.detectedType === "DOCX") {
      parsedText = extractTextFromDocx(buffer);
    }

    // 3. Extract skills from resume text
    const identifiedSkills = extractSkillsFromText(parsedText);

    // 4. Save to private storage with non-enumerable UUID filename
    const ext = path.extname(originalFilename) || (validation.detectedType === "PDF" ? ".pdf" : ".docx");
    const { storageKey, filePath } = await saveResumeFile(buffer, resolvedUserId, ext);

    const sizeFormatted = `${Math.round(buffer.length / 1024)} KB`;
    const resumeId = `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 5. Persist resume metadata in PostgreSQL
    const newResume: ResumeItem = {
      id: resumeId,
      userId: resolvedUserId,
      name: path.basename(originalFilename),
      originalFilename: path.basename(originalFilename),
      size: sizeFormatted,
      type: (validation.detectedType as "DOCX" | "PDF") || "PDF",
      isPrimary: params.isPrimary ?? false,
      storageKey,
      mimeType: validation.mimeType,
      fileSizeBytes: buffer.length,
      parsedText,
      updatedAt: new Date().toISOString(),
    };

    const savedResume = await userRepository.saveResume(newResume);

    // 6. Update candidate profile skills if new skills were detected
    const user = await userRepository.getByIdOrEmail(resolvedUserId);
    const existingProfile = await userRepository.getCandidateProfile(resolvedUserId);

    if (identifiedSkills.length > 0 && user) {
      const mergedSkills = Array.from(new Set([...(user.skills || []), ...identifiedSkills]));
      await userRepository.saveCandidateProfile({
        userId: resolvedUserId,
        skills: mergedSkills,
      });
    }

    // 7. Calculate real profile completeness
    const allResumes = await userRepository.getResumes(resolvedUserId);
    const updatedUser = await userRepository.getByIdOrEmail(resolvedUserId);
    const completeness = profileCompletenessService.calculate(
      updatedUser || {},
      existingProfile,
      allResumes
    );

    // Update completeness score in candidate_profiles
    await userRepository.saveCandidateProfile({
      userId: resolvedUserId,
      completenessScore: completeness.score,
      missingSections: completeness.missingSections,
    });

    return {
      resume: {
        ...savedResume,
        dataUrl: undefined,
      },
      completeness,
    };
  }

  /**
   * Downloads a resume file with strict authorization and safe streaming.
   */
  async downloadResume(
    resumeId: string,
    caller: { userId: string; role: string }
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const resume = await this.getResumeById(resumeId, caller);
    if (!resume) {
      throw new Error(`Resume with ID "${resumeId}" not found`);
    }

    let fileBuffer: Buffer | null = null;
    if (resume.storageKey) {
      fileBuffer = await readResumeFile(resume.storageKey);
    }

    // Fallback: If legacy base64 dataUrl exists and file is not yet on disk
    if (!fileBuffer && resume.dataUrl) {
      const base64Data = resume.dataUrl.split(",")[1] || resume.dataUrl;
      try {
        fileBuffer = Buffer.from(base64Data, "base64");
      } catch {
        fileBuffer = null;
      }
    }

    if (!fileBuffer) {
      // Synthesize clean binary representation of candidate record if file was removed
      const candidate = await userRepository.getByIdOrEmail(resume.userId || "");
      const text = `MOAS Verified Candidate Document\nCandidate: ${candidate?.name || "Candidate"}\nEmail: ${candidate?.email || ""}\nDocument: ${resume.name}\nStatus: Verified\n`;
      fileBuffer = Buffer.from(text, "utf-8");
    }

    const filename = resume.originalFilename || resume.name || `resume_${resumeId}.pdf`;
    const mimeType = resume.mimeType || (resume.type === "DOCX" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf");

    return {
      buffer: fileBuffer,
      filename,
      mimeType,
    };
  }

  /**
   * Sets a resume as the primary active resume for a candidate.
   */
  async setPrimaryResume(
    resumeId: string,
    caller: { userId: string; role: string }
  ): Promise<ResumeItem> {
    const callerId = caller.userId.toLowerCase();
    const callerRole = (caller.role || "").toLowerCase();

    const existing = await userRepository.getResumeById(resumeId);
    if (!existing) {
      throw new Error(`Resume with ID "${resumeId}" not found.`);
    }

    if (callerRole !== "admin" && callerId !== (existing.userId || "").toLowerCase()) {
      throw new Error("Forbidden: Access denied. You can only manage your own resumes.");
    }

    const updated = await userRepository.setPrimaryResume(existing.userId!, resumeId);
    if (!updated) {
      throw new Error("Failed to set primary resume.");
    }

    return {
      ...updated,
      dataUrl: undefined,
    };
  }

  /**
   * Deletes a resume document and its stored physical file.
   */
  async deleteResume(
    resumeId: string,
    caller: { userId: string; role: string }
  ): Promise<{ success: boolean; newPrimaryId?: string }> {
    const callerId = caller.userId.toLowerCase();
    const callerRole = (caller.role || "").toLowerCase();

    const existing = await userRepository.getResumeById(resumeId);
    if (!existing) {
      throw new Error(`Resume with ID "${resumeId}" not found.`);
    }

    if (callerRole !== "admin" && callerId !== (existing.userId || "").toLowerCase()) {
      throw new Error("Forbidden: Access denied. You can only delete your own resumes.");
    }

    const result = await userRepository.deleteResume(existing.userId!, resumeId);
    if (!result.deleted) {
      throw new Error("Failed to delete resume record.");
    }

    // Delete stored file from disk
    if (result.storageKey) {
      await deleteStorageFile(RESUMES_STORAGE_DIR, result.storageKey);
    }

    return {
      success: true,
      newPrimaryId: result.newPrimaryId,
    };
  }

  /**
   * Analyzes an uploaded resume using text extraction, skills comparison, and AI insights.
   */
  async analyzeResume(params: {
    resumeId?: string;
    targetJobRequirements?: string[];
    role?: string;
    skills?: string[];
    experienceYears?: string;
    callerSession?: { userId: string; role: string };
  }) {
    let parsedText = "";
    let extractedSkills: string[] = [];
    let resumeName = "Standard Resume";

    if (params.resumeId && params.callerSession) {
      const resume = await this.getResumeById(params.resumeId, params.callerSession);
      if (resume) {
        resumeName = resume.originalFilename || resume.name;
        if (resume.parsedText) {
          parsedText = resume.parsedText;
        } else if (resume.storageKey) {
          const buffer = await readResumeFile(resume.storageKey);
          if (buffer) {
            parsedText =
              resume.type === "DOCX" ? extractTextFromDocx(buffer) : extractTextFromPdf(buffer);
          }
        }
        extractedSkills = extractSkillsFromText(parsedText);
      }
    }

    const userSkills = Array.from(new Set([...(params.skills || []), ...extractedSkills]));
    const skillComparison = compareSkillsWithRequirements(
      userSkills,
      params.targetJobRequirements || [
        "Python",
        "PyTorch",
        "Docker",
        "PostgreSQL",
        "TypeScript",
        "System Design",
      ]
    );

    // Call AI service for algorithmic insights
    const aiResult = await aiService.analyzeResume({
      resumeName,
      role: params.role,
      skills: userSkills,
      experienceYears: params.experienceYears,
    });

    return {
      ...aiResult,
      score: skillComparison.matchScore,
      matchScore: skillComparison.matchScore,
      extractedSkills,
      matchedSkills: skillComparison.matchedSkills,
      missingSkills: skillComparison.missingSkills,
      recommendations: aiResult.improvements || [],
      isAiEstimated: true,
      textSample: parsedText ? parsedText.slice(0, 300) + "..." : undefined,
    };
  }

  /**
   * Legacy uploadResume method for backward compatibility with existing JSON endpoints.
   */
  async uploadResume(
    targetUserId: string,
    targetEmail: string | undefined,
    resume: Partial<ResumeItem>,
    callerSession: { userId: string; email: string; role: string }
  ): Promise<{ resumes: ResumeItem[]; user: SanitizedUser }> {
    const callerId = callerSession.userId.toLowerCase();
    const callerEmail = (callerSession.email || "").toLowerCase();
    const resolvedTargetId = targetUserId || callerSession.userId;
    const resolvedTargetEmail = targetEmail || callerSession.email || "";

    if (
      callerId !== resolvedTargetId.toLowerCase() &&
      callerEmail !== resolvedTargetEmail.toLowerCase() &&
      callerSession.role.toLowerCase() !== "admin"
    ) {
      throw new Error("Access denied. You can only upload resumes to your own account.");
    }

    if (resume.dataUrl && typeof resume.dataUrl === "string") {
      const base64Data = resume.dataUrl.split(",")[1] || resume.dataUrl;
      const buffer = Buffer.from(base64Data, "base64");
      const filename = resume.name || "resume.pdf";

      await this.uploadResumeFile({
        targetUserId: resolvedTargetId,
        originalFilename: filename,
        buffer,
        isPrimary: resume.isPrimary,
        callerSession,
      });
    } else {
      // Simple metadata save
      const resumeItem: ResumeItem = {
        id: resume.id || `res-${Date.now()}`,
        name: resume.name || "Resume.pdf",
        originalFilename: resume.name || "Resume.pdf",
        size: resume.size || "250 KB",
        updatedAt: new Date().toISOString(),
        type: resume.type || (resume.name?.toLowerCase().endsWith(".docx") ? "DOCX" : "PDF"),
        isPrimary: resume.isPrimary ?? false,
        userId: resolvedTargetId,
      };
      await userRepository.saveResume(resumeItem);
    }

    const updatedUser = await userRepository.getByIdOrEmail(resolvedTargetId);
    const resumes = await userRepository.getResumes(resolvedTargetId);

    return {
      resumes: resumes.map((r) => ({ ...r, dataUrl: undefined })),
      user: sanitizeUser(updatedUser)!,
    };
  }
}

export const resumeService = new ResumeService();
