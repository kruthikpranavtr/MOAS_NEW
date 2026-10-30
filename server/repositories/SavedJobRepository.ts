import { ISavedJobRepository } from "./IRepositories.js";
import { SavedJobRecord } from "../models/types.js";
import { query, withTransaction } from "../db/postgresClient.js";

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
      "SELECT * FROM saved_jobs WHERE user_id = $1 ORDER BY created_at DESC;",
      [userId]
    );
    return res.rows.map(mapRowToSavedJob);
  }

  async toggle(userId: string, jobId: string): Promise<{ saved: boolean; count?: number }> {
    return await withTransaction(async (client) => {
      // 1. Ensure user exists
      const userExists = await client.query("SELECT id FROM users WHERE id = $1 LIMIT 1;", [userId]);
      if (userExists.rows.length === 0) {
        await client.query(
          `INSERT INTO users (id, email, password_hash, role, name, email_verified)
          VALUES ($1, $2, 'scrypt:autogen', 'Candidate', 'User', true)
          ON CONFLICT (email) DO NOTHING;`,
          [userId, `${userId}@moas.ai`]
        );
      }

      // 2. Ensure job exists
      const jobExists = await client.query("SELECT id FROM jobs WHERE id = $1 LIMIT 1;", [jobId]);
      if (jobExists.rows.length === 0) {
        await client.query(
          `INSERT INTO jobs (id, title, company, status)
          VALUES ($1, 'Job Listing', 'Company', 'open')
          ON CONFLICT (id) DO NOTHING;`,
          [jobId]
        );
      }

      const existing = await client.query(
        "SELECT id FROM saved_jobs WHERE user_id = $1 AND job_id = $2 LIMIT 1;",
        [userId, jobId]
      );

      let isSaved = false;
      if (existing.rows.length > 0) {
        await client.query("DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2;", [userId, jobId]);
        isSaved = false;
      } else {
        const id = `saved-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await client.query(
          "INSERT INTO saved_jobs (id, user_id, job_id, saved_date) VALUES ($1, $2, $3, NOW());",
          [id, userId, jobId]
        );
        isSaved = true;
      }

      const countRes = await client.query(
        "SELECT COUNT(*) as total FROM saved_jobs WHERE user_id = $1;",
        [userId]
      );
      const count = parseInt(countRes.rows[0].total || "0", 10);

      return { saved: isSaved, count };
    });
  }
}

export const savedJobRepository = new SavedJobRepository();
