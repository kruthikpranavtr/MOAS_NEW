import { ISavedJobRepository } from "./IRepositories.js";
import { SavedJobRecord } from "../models/types.js";
import { getSavedJobs, toggleSavedJob } from "../db.js";

export class SavedJobRepository implements ISavedJobRepository {
  async getByUser(userId: string): Promise<SavedJobRecord[]> {
    const list = await getSavedJobs(userId);
    return list.map((item) => ({
      id: item.id,
      userId: item.userId,
      jobId: item.jobId,
      savedDate: item.savedDate,
      savedAt: item.savedDate,
    }));
  }

  async toggle(userId: string, jobId: string): Promise<{ saved: boolean; count?: number }> {
    return await toggleSavedJob(userId, jobId);
  }
}

export const savedJobRepository = new SavedJobRepository();
