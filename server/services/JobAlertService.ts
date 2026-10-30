import { IJobAlertRepository } from "../repositories/IRepositories.js";
import { jobAlertRepository } from "../repositories/JobAlertRepository.js";
import { JobAlertRecord } from "../models/types.js";

export class JobAlertService {
  constructor(private readonly jobAlertRepo: IJobAlertRepository = jobAlertRepository) {}

  async getAlerts(userId: string): Promise<JobAlertRecord[]> {
    if (!userId) return [];
    return await this.jobAlertRepo.getByUser(userId);
  }

  async createAlert(alertData: Partial<JobAlertRecord>): Promise<JobAlertRecord> {
    if (!alertData.query && !alertData.title) {
      throw new Error("Job alert query or title is required.");
    }
    const newAlert: JobAlertRecord = {
      id: alertData.id || `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: alertData.userId || "anonymous",
      title: alertData.title || alertData.query || "Job Alert",
      query: alertData.query || "",
      location: alertData.location || "Anywhere",
      frequency: alertData.frequency || "daily",
      channel: alertData.channel || "email",
      active: alertData.active !== undefined ? alertData.active : true,
      createdAt: alertData.createdAt || new Date().toISOString(),
    };
    return await this.jobAlertRepo.save(newAlert);
  }

  async deleteAlert(id: string): Promise<boolean> {
    if (!id) throw new Error("Alert ID is required.");
    return await this.jobAlertRepo.delete(id);
  }
}

export const jobAlertService = new JobAlertService();
