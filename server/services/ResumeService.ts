import { userRepository } from "../repositories/UserRepository.js";
import { ResumeItem, SanitizedUser } from "../models/types.js";
import { sanitizeUser } from "../utils/crypto.js";

export class ResumeService {
  async getResumesForUser(userId: string): Promise<ResumeItem[]> {
    return await userRepository.getResumes(userId);
  }

  async uploadResume(
    targetUserId: string,
    targetEmail: string | undefined,
    resume: Partial<ResumeItem>,
    callerSession: { userId: string; email: string; role: string }
  ): Promise<{ resumes: ResumeItem[]; user: SanitizedUser }> {
    const callerId = callerSession.userId.toLowerCase();
    const callerEmail = callerSession.email.toLowerCase();
    const reqUserId = (targetUserId || "").toLowerCase();
    const reqUserEmail = (targetEmail || "").toLowerCase();

    if (callerId !== reqUserId && callerEmail !== reqUserEmail && callerSession.role.toLowerCase() !== "admin") {
      throw new Error("Access denied. You can only upload resumes to your own account.");
    }

    if (!resume || !resume.name) {
      throw new Error("Resume object with name is required");
    }

    let user = await userRepository.getByIdOrEmail(targetUserId || callerSession.userId);
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
