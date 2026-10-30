import { CandidateProfileRecord, ResumeItem, UserRecord } from "../models/types.js";

export interface ProfileCompletenessResult {
  score: number;
  percentage: number;
  completenessScore: number;
  missingSections: string[];
  breakdown: {
    basicInfo: number;
    headlineAndBio: number;
    skills: number;
    education: number;
    workExperience: number;
    resume: number;
    photo: number;
  };
}

export class ProfileCompletenessService {
  /**
   * Calculates real candidate profile completeness based on actual saved data.
   */
  calculate(
    user: Partial<UserRecord>,
    candidateProfile?: Partial<CandidateProfileRecord> | null,
    resumes?: ResumeItem[]
  ): ProfileCompletenessResult {
    const missingSections: string[] = [];
    let basicInfo = 0;
    let headlineAndBio = 0;
    let skillsScore = 0;
    let educationScore = 0;
    let workExpScore = 0;
    let resumeScore = 0;
    let photoScore = 0;

    // 1. Basic Info (15%)
    if (user.name && user.name.trim().length > 1) basicInfo += 5;
    if (user.email && user.email.includes("@")) basicInfo += 5;
    if (user.phone && user.phone.trim().length >= 8) basicInfo += 3;
    if (user.location && user.location.trim().length > 1) basicInfo += 2;

    if (!user.phone || user.phone.trim().length < 8 || !user.location) {
      missingSections.push("Contact Details & Location");
    }

    // 2. Headline & Bio (15%)
    const headline = candidateProfile?.headline || user.role || user.quote;
    const bio = candidateProfile?.bio || user.aboutMe;

    if (headline && headline.trim().length > 2) headlineAndBio += 7;
    if (bio && bio.trim().length >= 20) headlineAndBio += 8;
    else if (bio && bio.trim().length > 0) headlineAndBio += 4;

    if (!headline || !bio || bio.trim().length < 20) {
      missingSections.push("Professional Headline & Summary Bio");
    }

    // 3. Skills (20%)
    const userSkills = candidateProfile?.skills || user.skills || [];
    if (userSkills.length >= 3) {
      skillsScore = 20;
    } else if (userSkills.length >= 1) {
      skillsScore = 10;
      missingSections.push("Add at least 3 Technical Skills");
    } else {
      missingSections.push("Technical Skills & Expertise");
    }

    // 4. Education (15%)
    const educationList = candidateProfile?.education || user.education || [];
    if (educationList.length >= 1) {
      educationScore = 15;
    } else {
      missingSections.push("Educational Qualifications");
    }

    // 5. Work Experience (15%)
    const workExperienceList = candidateProfile?.workExperience || user.workExperience || [];
    if (workExperienceList.length >= 1) {
      workExpScore = 15;
    } else {
      missingSections.push("Work Experience History");
    }

    // 6. Resume (15%)
    const resumeList = resumes || user.resumes || [];
    const hasPrimaryResume = resumeList.some((r) => r.isPrimary) || resumeList.length > 0;
    if (hasPrimaryResume) {
      resumeScore = 15;
    } else {
      missingSections.push("Primary Resume Document");
    }

    // 7. Profile Photo (5%)
    const avatar = user.avatarUrl || "";
    const isCustomAvatar =
      avatar.length > 0 &&
      !avatar.includes("name=User") &&
      !avatar.includes("ui-avatars.com/api/?name=User");
    if (isCustomAvatar) {
      photoScore = 5;
    } else {
      missingSections.push("Profile Photo");
    }

    const totalScore = Math.min(
      100,
      basicInfo + headlineAndBio + skillsScore + educationScore + workExpScore + resumeScore + photoScore
    );

    return {
      score: totalScore,
      percentage: totalScore,
      completenessScore: totalScore,
      missingSections,
      breakdown: {
        basicInfo,
        headlineAndBio,
        skills: skillsScore,
        education: educationScore,
        workExperience: workExpScore,
        resume: resumeScore,
        photo: photoScore,
      },
    };
  }
}

export const profileCompletenessService = new ProfileCompletenessService();
