import { initDatabase, closePool } from "../server/db/postgresClient.js";
import { migrator } from "../server/db/migrator.js";
import { runSeeds } from "../server/db/seeds.js";
import { logger } from "../server/utils/logger.js";

async function main() {
  const command = process.argv[2] || "migrate";
  const isDryRun = process.argv.includes("--dry-run");

  logger.info(`[Database CLI] Executing command '${command}' (dryRun: ${isDryRun})...`);

  try {
    await initDatabase();

    if (command === "migrate") {
      const result = await migrator.runMigrations();
      logger.info(`[Database CLI] Migrations complete: ${result.applied} migration(s) applied.`);
    } else if (command === "seed") {
      await migrator.runMigrations();
      const result = await runSeeds(true);
      logger.info("[Database CLI] Seeding complete:", result);
    } else if (command === "data-migrate") {
      await migrator.runMigrations();
      const { migrateLegacyDataToPostgres } = await import("../server/db/dataMigrator.js");
      const report = await migrateLegacyDataToPostgres(isDryRun);
      logger.info("[Database CLI] Data migration complete. Report summary:", {
        status: report.status,
        isDryRun: report.isDryRun,
        totalSource: report.totalSourceRecords,
        totalMigrated: report.totalMigratedRecords,
        errors: {
          users: report.details.users.errors.slice(0, 5),
          jobs: report.details.jobs.errors.slice(0, 5),
          applications: report.details.applications.errors.slice(0, 5),
          companies: report.details.companies.errors.slice(0, 5),
        },
      });
    } else if (command === "status") {
      const status = await migrator.getStatus();
      logger.info("[Database CLI] Migration Status:", {
        appliedCount: status.applied.length,
        pendingCount: status.pending.length,
        isUpToDate: status.isUpToDate,
      });
    } else {
      logger.error(`[Database CLI] Unknown command: ${command}. Use migrate, seed, data-migrate, or status.`);
      process.exit(1);
    }
  } catch (err) {
    logger.error("[Database CLI] Execution failed:", err);
    process.exit(1);
  } finally {
    await closePool();
    process.exit(0);
  }
}

main();
