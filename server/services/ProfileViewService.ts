import { IProfileViewRepository } from "../repositories/IRepositories.js";
import { profileViewRepository } from "../repositories/ProfileViewRepository.js";
import { ProfileViewRecord } from "../models/types.js";

export class ProfileViewService {
  constructor(private readonly profileViewRepo: IProfileViewRepository = profileViewRepository) {}

  async getViews(userId?: string): Promise<{ count: number; views: ProfileViewRecord[] }> {
    return await this.profileViewRepo.getAll(userId);
  }

  async recordView(viewData: {
    userId?: string;
    recruiterId?: string;
    recruiterName?: string;
    recruiterRole?: string;
    recruiterCompany?: string;
    recruiterAvatar?: string;
    action?: "viewed" | "searched" | "downloaded_resume";
  }): Promise<ProfileViewRecord> {
    return await this.profileViewRepo.record({
      userId: viewData.userId || "anonymous",
      recruiterId: viewData.recruiterId || "rec_anon",
      recruiterName: viewData.recruiterName || "Recruiter",
      recruiterRole: viewData.recruiterRole || "Talent Acquisition",
      recruiterCompany: viewData.recruiterCompany || "Confidential",
      recruiterAvatar: viewData.recruiterAvatar || "",
      action: viewData.action || "viewed",
    });
  }

  async clearViews(userId?: string): Promise<{ success: boolean; cleared: number } | boolean> {
    return await this.profileViewRepo.clear(userId);
  }
}

export const profileViewService = new ProfileViewService();
