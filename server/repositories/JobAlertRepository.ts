import { IJobAlertRepository } from "./IRepositories.js";
import { JobAlertRecord } from "../models/types.js";
import { getJobAlerts, saveJobAlert, deleteJobAlert } from "../db.js";

export class JobAlertRepository implements IJobAlertRepository {
  async getByUser(userId: string): Promise<JobAlertRecord[]> {
    return (await getJobAlerts(userId)) as JobAlertRecord[];
  }

  async save(alert: JobAlertRecord): Promise<JobAlertRecord> {
    return (await saveJobAlert(alert as any)) as JobAlertRecord;
  }

  async delete(id: string): Promise<boolean> {
    return await deleteJobAlert(id);
  }
}

export const jobAlertRepository = new JobAlertRepository();
