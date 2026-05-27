import { execSync } from "node:child_process";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { seedGamesCatalog } from "./seed-games";
import { seedDefaults } from "./seed-defaults";

/**
 * Runs in Railway's preDeployCommand.
 *
 * 1. If RESET_DB_ON_DEPLOY=true, wipe the public schema first. Use this once
 *    to recover a database left in a half-applied state, then remove the
 *    variable so normal deploys never destroy data.
 * 2. Sync the schema with `drizzle-kit push --force` (creates missing tables,
 *    leaves existing ones alone).
 * 3. If SEED_GAMES_ON_DEPLOY=true, idempotently insert the TEG game catalog.
 *    Safe to leave on (existing games are skipped), but typically set once
 *    then removed.
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

  // Reference data (teams + skills) is always kept up to date — idempotent.
  await seedDefaults();

  if (process.env.SEED_GAMES_ON_DEPLOY === "true") {
    console.log("→ SEED_GAMES_ON_DEPLOY=true — seeding game catalog");
    await seedGamesCatalog();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("deploy schema step failed:", err);
  process.exit(1);
});
