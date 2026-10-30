import { IApplicationRepository } from "./IRepositories.js";
import { ApplicationRecord } from "../models/types.js";
import {
  getApplications,
  createApplication,
  updateApplicationStatus,
  deleteApplication,
} from "../db.js";

export class ApplicationRepository implements IApplicationRepository {
  async getAll(candidateId?: string): Promise<ApplicationRecord[]> {
    return (await getApplications(candidateId)) as ApplicationRecord[];
  }

  async getById(id: string): Promise<ApplicationRecord | null> {
    const all = await this.getAll();
    return all.find((a) => a.id === id) || null;
  }

  async create(app: ApplicationRecord): Promise<ApplicationRecord> {
    return (await createApplication(app as any)) as ApplicationRecord;
  }

  async updateStatus(
    id: string,
    status: ApplicationRecord["status"],
    stage?: string
  ): Promise<ApplicationRecord | null> {
    return (await updateApplicationStatus(id, status, stage)) as ApplicationRecord | null;
  }

  async delete(id: string): Promise<boolean> {
    return await deleteApplication(id);
  }
}

export const applicationRepository = new ApplicationRepository();
