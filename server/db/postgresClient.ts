import pg from "pg";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let isConnected = false;

export function getPoolConfig(): pg.PoolConfig {
  let connectionString = config.database.url;

  // Ensure search_path is set in the options if not already specified
  if (!connectionString.includes("search_path")) {
    const separator = connectionString.includes("?") ? "&" : "?";
    connectionString = `${connectionString}${separator}options=-c%20search_path%3Dmoas,public`;
  }

  const poolConfig: pg.PoolConfig = {
    connectionString,
    min: config.database.poolMin,
    max: config.database.poolMax,
    connectionTimeoutMillis: config.database.connectionTimeoutMs,
    idleTimeoutMillis: config.database.idleTimeoutMs,
  };

  if (config.database.ssl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  return poolConfig;
}

export function getPool(): pg.Pool {
  if (!pool) {
    const poolConfig = getPoolConfig();
    pool = new Pool(poolConfig);

    pool.on("error", (err) => {
      logger.error("[PostgreSQL] Unexpected client error in connection pool:", err);
    });
  }
  return pool;
}

export async function initDatabase(): Promise<boolean> {
  const currentPool = getPool();
  try {
    const client = await currentPool.connect();
    try {
      await client.query("CREATE SCHEMA IF NOT EXISTS moas;");
      await client.query("SET search_path TO moas, public;");
      const res = await client.query("SELECT current_database(), current_user, version();");
      isConnected = true;
      logger.info("[PostgreSQL] Connected successfully to database:", {
        database: res.rows[0].current_database,
        user: res.rows[0].current_user,
      });
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    isConnected = false;
    logger.error("[PostgreSQL] Failed to initialize PostgreSQL connection:", err.message);

    // Fail-fast rule: In production, never silently continue or fall back to temporary memory storage
    if (config.app.isProduction) {
      throw new Error(`[FATAL] PostgreSQL connection failed in production mode: ${err.message}`);
    }
    return false;
  }
}

export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const currentPool = getPool();
  const start = Date.now();
  try {
    const result = await currentPool.query<T>(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      logger.warn(`[PostgreSQL Slow Query] (${duration}ms):`, { query: text.substring(0, 100) });
    }
    return result;
  } catch (err: any) {
    logger.error("[PostgreSQL Query Error]:", {
      query: text.substring(0, 150),
      message: err.message,
    });
    throw err;
  }
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const currentPool = getPool();
  const client = await currentPool.connect();
  try {
    await client.query("BEGIN;");
    const result = await callback(client);
    await client.query("COMMIT;");
    return result;
  } catch (error) {
    await client.query("ROLLBACK;");
    throw error;
  } finally {
    client.release();
  }
}

export interface DbHealthResult {
  status: "connected" | "disconnected";
  latencyMs: number;
  database?: string;
  user?: string;
  pool: {
    total: number;
    idle: number;
    waiting: number;
  };
  error?: string;
}

export async function checkDbHealth(): Promise<DbHealthResult> {
  const currentPool = getPool();
  const start = Date.now();
  try {
    const result = await currentPool.query("SELECT current_database(), current_user, 1 as ok;");
    const latencyMs = Date.now() - start;
    return {
      status: "connected",
      latencyMs,
      database: result.rows[0].current_database,
      user: result.rows[0].current_user,
      pool: {
        total: currentPool.totalCount,
        idle: currentPool.idleCount,
        waiting: currentPool.waitingCount,
      },
    };
  } catch (err: any) {
    return {
      status: "disconnected",
      latencyMs: Date.now() - start,
      pool: {
        total: currentPool.totalCount,
        idle: currentPool.idleCount,
        waiting: currentPool.waitingCount,
      },
      error: err.message,
    };
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    const currentPool = pool;
    pool = null;
    isConnected = false;
    logger.info("[PostgreSQL] Draining connection pool...");
    try {
      await currentPool.end();
    } catch (err: any) {
      if (!err.message?.includes("Called end on pool more than once")) {
        logger.warn("[PostgreSQL] Error during pool drain:", err.message);
      }
    }
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}
