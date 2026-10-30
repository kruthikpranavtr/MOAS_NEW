import fs from "fs";
import path from "path";
import { query, withTransaction } from "./postgresClient.js";
import { logger } from "../utils/logger.js";

export interface MigrationRecord {
  version: number;
  name: string;
  applied_at: Date;
}

export interface MigrationFile {
  version: number;
  name: string;
  filename: string;
  filepath: string;
}

export class Migrator {
  private migrationsDir: string;

  constructor(migrationsDir?: string) {
    this.migrationsDir = migrationsDir || path.join(process.cwd(), "server", "db", "migrations");
  }

  public getAvailableMigrations(): MigrationFile[] {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.migrationsDir);
    const migrations: MigrationFile[] = [];

    for (const file of files) {
      if (file.endsWith(".sql")) {
        const match = file.match(/^(\d+)_(.+)\.sql$/);
        if (match) {
          migrations.push({
            version: parseInt(match[1], 10),
            name: match[2],
            filename: file,
            filepath: path.join(this.migrationsDir, file),
          });
        }
      }
    }

    return migrations.sort((a, b) => a.version - b.version);
  }

  public async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      await query(`
        CREATE SCHEMA IF NOT EXISTS moas;
        SET search_path TO moas, public;
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const res = await query<MigrationRecord>(
        "SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC;"
      );
      return res.rows;
    } catch (err: any) {
      logger.error("[Migrator] Failed to fetch applied migrations:", err.message);
      throw err;
    }
  }

  public async runMigrations(): Promise<{ applied: number; details: string[] }> {
    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map((m) => m.version));
    const available = this.getAvailableMigrations();

    const pending = available.filter((m) => !appliedVersions.has(m.version));
    const details: string[] = [];

    if (pending.length === 0) {
      logger.info("[Migrator] Database schema is up to date (0 pending migrations).");
      return { applied: 0, details };
    }

    logger.info(`[Migrator] Found ${pending.length} pending migration(s) to execute.`);

    for (const migration of pending) {
      const sql = fs.readFileSync(migration.filepath, "utf-8");

      await withTransaction(async (client) => {
        logger.info(`[Migrator] Applying migration ${migration.version}: ${migration.name}...`);
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, NOW()) ON CONFLICT (version) DO NOTHING;",
          [migration.version, migration.name]
        );
      });

      const msg = `Applied migration ${migration.version} (${migration.name})`;
      details.push(msg);
      logger.info(`[Migrator] Successfully ${msg}.`);
    }

    return { applied: pending.length, details };
  }

  public async getStatus(): Promise<{
    applied: MigrationRecord[];
    pending: MigrationFile[];
    isUpToDate: boolean;
  }> {
    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map((m) => m.version));
    const available = this.getAvailableMigrations();
    const pending = available.filter((m) => !appliedVersions.has(m.version));

    return {
      applied,
      pending,
      isUpToDate: pending.length === 0,
    };
  }
}

export const migrator = new Migrator();
