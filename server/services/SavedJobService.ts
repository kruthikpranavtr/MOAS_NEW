import { ISavedJobRepository } from "../repositories/IRepositories.js";
import { savedJobRepository } from "../repositories/SavedJobRepository.js";
import { SavedJobRecord } from "../models/types.js";

export class SavedJobService {
  constructor(private readonly savedJobRepo: ISavedJobRepository = savedJobRepository) {}

  async getSavedJobs(userId: string): Promise<SavedJobRecord[]> {
    if (!userId) return [];
    return await this.savedJobRepo.getByUserWithJobs(userId);
  }

  async toggleSavedJob(userId: string, jobId: string): Promise<{ saved: boolean; count?: number }> {
    if (!userId || !jobId) {
      throw new Error("User ID and Job ID are required to toggle bookmark.");
    }
    return await this.savedJobRepo.toggle(userId, jobId);
  }

  async removeSavedJob(userId: string, jobId: string): Promise<boolean> {
    if (!userId || !jobId) {
      throw new Error("User ID and Job ID are required to remove saved job.");
    }
    return await this.savedJobRepo.delete(userId, jobId);
  }
}

export const savedJobService = new SavedJobService();
