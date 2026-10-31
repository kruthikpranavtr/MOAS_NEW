import { ISavedJobRepository } from "./IRepositories.js";
import { SavedJobRecord, JobRecord } from "../models/types.js";
import { query, withTransaction } from "../db/postgresClient.js";
import { mapRowToJob } from "./JobRepository.js";

function mapRowToSavedJob(row: any): SavedJobRecord {
  return {
    id: row.id,
    userId: row.user_id,
    jobId: row.job_id,
    savedDate: row.saved_date || row.created_at,
    savedAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export class SavedJobRepository implements ISavedJobRepository {
  async getByUser(userId: string): Promise<SavedJobRecord[]> {
    const res = await query(
      "SELECT * FROM moas.saved_jobs WHERE user_id = $1 ORDER BY created_at DESC;",
      [userId]
    );
    return res.rows.map(mapRowToSavedJob);
  }

  async getByUserWithJobs(userId: string): Promise<SavedJobRecord[]> {
    const res = await query(
      `SELECT 
        sj.id as sj_id,
        sj.user_id as sj_user_id,
        sj.job_id as sj_job_id,
        sj.saved_date as sj_saved_date,
        sj.created_at as sj_created_at,
        j.*
       FROM moas.saved_jobs sj
       JOIN moas.jobs j ON sj.job_id = j.id
       WHERE sj.user_id = $1
       ORDER BY sj.created_at DESC;`,
      [userId]
    );

    return res.rows.map((row) => {
      const savedJob: SavedJobRecord = {
        id: row.sj_id,
        userId: row.sj_user_id,
        jobId: row.sj_job_id,
        savedDate: row.sj_saved_date || row.sj_created_at,
        savedAt: row.sj_created_at ? new Date(row.sj_created_at).toISOString() : new Date().toISOString(),
        job: mapRowToJob(row),
      };
      return savedJob;
    });
  }

  async toggle(userId: string, jobId: string): Promise<{ saved: boolean; count?: number }> {
    return await withTransaction(async (client) => {
      // 1. Ensure user exists
      const userExists = await client.query("SELECT id FROM moas.users WHERE id = $1 LIMIT 1;", [userId]);
      if (userExists.rows.length === 0) {
        await client.query(
          `INSERT INTO moas.users (id, email, password_hash, role, name, email_verified)
          VALUES ($1, $2, 'scrypt:autogen', 'Candidate', 'User', true)
          ON CONFLICT (email) DO NOTHING;`,
          [userId, `${userId}@moas.ai`]
        );
      }

      // 2. Ensure job exists
      const jobExists = await client.query("SELECT id FROM moas.jobs WHERE id = $1 LIMIT 1;", [jobId]);
      if (jobExists.rows.length === 0) {
        throw new Error(`Job with ID "${jobId}" not found.`);
      }

      const existing = await client.query(
        "SELECT id FROM moas.saved_jobs WHERE user_id = $1 AND job_id = $2 LIMIT 1;",
        [userId, jobId]
      );

      let isSaved = false;
      if (existing.rows.length > 0) {
        await client.query("DELETE FROM moas.saved_jobs WHERE user_id = $1 AND job_id = $2;", [userId, jobId]);
        isSaved = false;
      } else {
        const id = `saved-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await client.query(
          "INSERT INTO moas.saved_jobs (id, user_id, job_id, saved_date) VALUES ($1, $2, $3, NOW());",
          [id, userId, jobId]
        );
        isSaved = true;
      }

      const countRes = await client.query(
        "SELECT COUNT(*) as total FROM moas.saved_jobs WHERE user_id = $1;",
        [userId]
      );
      const count = parseInt(countRes.rows[0].total || "0", 10);

      return { saved: isSaved, count };
    });
  }

  async delete(userId: string, jobId: string): Promise<boolean> {
    const res = await query(
      "DELETE FROM moas.saved_jobs WHERE user_id = $1 AND (job_id = $2 OR id = $2);",
      [userId, jobId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export const savedJobRepository = new SavedJobRepository();
