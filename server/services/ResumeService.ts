import { userRepository } from "../repositories/UserRepository.js";
import { applicationRepository } from "../repositories/ApplicationRepository.js";
import { ResumeItem, SanitizedUser } from "../models/types.js";
import { sanitizeUser } from "../utils/crypto.js";

export class ResumeService {
  async getResumesForUser(userId: string): Promise<ResumeItem[]> {
    return await userRepository.getResumes(userId);
  }

  async getResumeById(
    resumeId: string,
    caller: { userId: string; role: string }
  ): Promise<ResumeItem | null> {
    const resume = await userRepository.getResumeById(resumeId);
    if (!resume) return null;

    const callerRole = (caller.role || "").toLowerCase();
    if (callerRole === "admin") return resume;

    if (callerRole === "candidate" || callerRole === "jobseeker") {
      if (resume.userId !== caller.userId) {
        throw new Error("Forbidden: Access denied. You can only view your own resumes.");
      }
      return resume;
    }

    if (callerRole === "employer") {
      const hasApplied = await applicationRepository.isCandidateApplicantForEmployer(
        resume.userId || "",
        caller.userId
      );
      if (!hasApplied) {
        throw new Error("Forbidden: Access denied. You can only view resumes of candidates who have applied to your company's jobs.");
      }
      return resume;
    }

    throw new Error("Forbidden: Unauthorized access.");
  }

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

    if (!resume || !resume.name) {
      throw new Error("Resume object with name is required");
    }

    let user = await userRepository.getByIdOrEmail(resolvedTargetId);
    if (!user) {
      user = await userRepository.getByIdOrEmail(callerSession.userId);
    }

    const newResumeItem: ResumeItem = {
      id: resume.id || `res-${Date.now()}`,
      name: resume.name,
      size: resume.size || "250 KB",
      updatedAt: "Permanent Verified",
      type: resume.type || (resume.name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX"),
      isPrimary: resume.isPrimary || (user ? (user.resumes || []).length === 0 : true),
      dataUrl: resume.dataUrl,
      userId: user?.id || callerSession.userId,
    };

    if (user) {
      const existingResumes = user.resumes || [];
      const updatedList = newResumeItem.isPrimary
        ? [newResumeItem, ...existingResumes.map((r) => ({ ...r, isPrimary: false })).filter((r) => r.name !== newResumeItem.name)]
        : [newResumeItem, ...existingResumes.filter((r) => r.name !== newResumeItem.name)];

      user.resumes = updatedList;
      await userRepository.save(user);
      await userRepository.saveResume(newResumeItem);

      return {
        resumes: updatedList,
        user: sanitizeUser(user)!,
      };
    } else {
      const newUser = await userRepository.save({
        id: callerSession.userId,
        name: callerSession.role || "Candidate",
        email: callerSession.email,
        phone: "+91 98450 12345",
        role: "Candidate",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces",
        location: "Bangalore, India",
        resumes: [newResumeItem],
        createdAt: new Date().toISOString(),
      });
      await userRepository.saveResume(newResumeItem);

      return {
        resumes: [newResumeItem],
        user: sanitizeUser(newUser)!,
      };
    }
  }
}

export const resumeService = new ResumeService();
