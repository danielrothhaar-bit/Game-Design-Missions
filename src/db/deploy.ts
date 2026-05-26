import { execSync } from "node:child_process";
import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * Runs in Railway's preDeployCommand.
 *
 * 1. If RESET_DB_ON_DEPLOY=true, wipe the public schema first. Use this once
 *    to recover a database left in a half-applied state, then remove the
 *    variable so normal deploys never destroy data.
 * 2. Sync the schema with `drizzle-kit push --force` (creates missing tables,
 *    leaves existing ones alone).
 */
async function main() {
  if (process.env.RESET_DB_ON_DEPLOY === "true") {
    console.log("⚠ RESET_DB_ON_DEPLOY=true — wiping public schema");
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    console.log("✓ schema wiped");
  }

  console.log("→ syncing schema (drizzle-kit push --force)");
  execSync("npx drizzle-kit push --force", { stdio: "inherit" });
  console.log("✓ schema sync complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("deploy schema step failed:", err);
  process.exit(1);
});
