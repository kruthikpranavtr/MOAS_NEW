import { IJobRepository } from "./IRepositories.js";
import { JobRecord } from "../models/types.js";
import { getAllJobs, getJobById, saveJob, deleteJob } from "../db.js";

export class JobRepository implements IJobRepository {
  async getAll(search?: string, department?: string, location?: string): Promise<JobRecord[]> {
    return (await getAllJobs(search, department, location)) as JobRecord[];
  }

  async getById(id: string): Promise<JobRecord | null> {
    const job = await getJobById(id);
    return (job as JobRecord) || null;
  }

  async save(job: JobRecord): Promise<JobRecord> {
    return (await saveJob(job as any)) as JobRecord;
  }

  async delete(id: string): Promise<boolean> {
    return await deleteJob(id);
  }
}

export const jobRepository = new JobRepository();
