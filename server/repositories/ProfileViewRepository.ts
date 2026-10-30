import { IProfileViewRepository } from "./IRepositories.js";
import { ProfileViewRecord } from "../models/types.js";
import { getProfileViews, recordProfileView, clearProfileViews } from "../db.js";

export class ProfileViewRepository implements IProfileViewRepository {
  async getAll(userId?: string): Promise<{ count: number; views: ProfileViewRecord[] }> {
    const res = await getProfileViews(userId);
    return {
      count: res.count,
      views: res.views as ProfileViewRecord[],
    };
  }

  async record(view: Partial<ProfileViewRecord>): Promise<ProfileViewRecord> {
    const res = await recordProfileView(view as any);
    return res.view as ProfileViewRecord;
  }

  async clear(userId?: string): Promise<{ success: boolean; cleared: number }> {
    return await clearProfileViews(userId);
  }
}

export const profileViewRepository = new ProfileViewRepository();
