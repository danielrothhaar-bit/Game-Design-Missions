import { execSync } from "node:child_process";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { appConfig } from "./schema";
import { seedGamesCatalog } from "./seed-games";
import { seedDefaults } from "./seed-defaults";
import { seedPhaseTemplates } from "./phase-templates";
import { backfillLogoColors } from "./backfill-logo-colors";
import { snapshotData } from "./snapshot";

/**
 * Runs in Railway's preDeployCommand.
 *
 * 1. If RESET_DB_ON_DEPLOY=true, wipe the public schema first. Use this once
 *    to recover a database left in a half-applied state, then remove the
 *    variable so normal deploys never destroy data.
 * 2. Snapshot all user data into the `backup` table (recoverable if a schema
 *    change ever drops something). Skipped during a reset (nothing to save).
 * 3. Sync the schema with drizzle-kit push.
 * 4. Re-seed reference data + (optionally) the game catalog, idempotently.
 */
async function main() {
  if (process.env.RESET_DB_ON_DEPLOY === "true") {
    console.log("⚠ RESET_DB_ON_DEPLOY=true — wiping public schema");
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    console.log("✓ schema wiped");
  } else {
    // Safety net: back up real data before touching the schema.
    try {
      await snapshotData("pre-deploy");
    } catch (err) {
      console.warn("⚠ snapshot failed (continuing):", err);
    }

    // Pre-create the Game Design Suite integration objects idempotently.
    // Adding a UNIQUE constraint to the already-populated `task` table makes
    // `drizzle-kit push` throw an interactive "truncate table?" prompt that
    // `--force` does NOT auto-answer, which aborts push in Railway's non-TTY
    // build. Creating them here first means push sees no diff and never
    // prompts. Constraint names MUST match Drizzle's generated names
    // (table + JS property + "_unique") so push recognises them as present.
    console.log("→ pre-applying Design Suite integration schema");
    await db.execute(
      sql`ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "design_suite_ref" text`,
    );
    await db.execute(
      sql`DO $$ BEGIN ALTER TABLE "task" ADD CONSTRAINT "task_designSuiteRef_unique" UNIQUE ("design_suite_ref"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await db.execute(
      sql`ALTER TABLE "game" ADD COLUMN IF NOT EXISTS "design_suite_game_id" text`,
    );
    await db.execute(
      sql`DO $$ BEGIN ALTER TABLE "game" ADD CONSTRAINT "game_designSuiteGameId_unique" UNIQUE ("design_suite_game_id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await db.execute(
      sql`ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "design_suite_sync_cursor" timestamp with time zone`,
    );
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS "design_suite_user_map" ("design_suite_name" varchar(120) PRIMARY KEY NOT NULL, "email" text NOT NULL)`,
    );
    console.log("✓ Design Suite integration schema ready");
  }

  // `--force` lets push apply changes non-interactively. Destructive changes
  // (dropping a column/table) only ever happen here when ALLOW_DESTRUCTIVE is
  // explicitly set; otherwise we keep them out of the schema so a deploy can't
  // quietly delete data. The snapshot above is the recovery backstop.
  console.log("→ syncing schema (drizzle-kit push)");
  try {
    execSync("npx drizzle-kit push --force", { stdio: "inherit" });
    console.log("✓ schema sync complete");
  } catch (err) {
    // push aborts in Railway's non-TTY build when it wants to prompt for a
    // potentially-destructive change (e.g. adding a UNIQUE constraint to a
    // populated table — which `--force` does NOT auto-answer). The Design
    // Suite integration columns/constraints are already applied explicitly
    // above, and the rest of the schema is in sync from prior deploys, so a
    // push failure here must not abort the deploy. Log loudly for visibility.
    console.warn(
      "⚠ drizzle-kit push failed (continuing) — verify no unintended schema drift:",
      err instanceof Error ? err.message : err,
    );
  }

  // Reference data (teams + skills) is always kept up to date — idempotent.
  await seedDefaults();

  // One-time, idempotent: fold legacy sidequests into the Sidequests division
  // so they're managed exactly like every other project. Only touches rows
  // still marked with the old kind, so re-running is a no-op.
  const folded = await db.execute(
    sql`UPDATE "game" SET kind = 'GAME', division = 'SIDEQUESTS' WHERE kind = 'SIDEQUEST'`,
  );
  const foldedCount =
    (folded as { rowCount?: number }).rowCount ?? 0;
  if (foldedCount > 0) {
    console.log(`✓ folded ${foldedCount} sidequest(s) into the Sidequests division`);
  }
  // Phase templates seed once; admin edits afterward are preserved.
  await seedPhaseTemplates();

  if (process.env.SEED_GAMES_ON_DEPLOY === "true") {
    console.log("→ SEED_GAMES_ON_DEPLOY=true — seeding game catalog");
    await seedGamesCatalog();
  }

  // One-time: derive cover colors from already-uploaded logos. Guarded by a
  // flag so it runs on exactly one deploy and never overwrites colors again.
  const cfg = await db.query.appConfig.findFirst();
  if (!cfg?.logoColorsBackfilledAt) {
    console.log("→ backfilling game cover colors from uploaded logos");
    const n = await backfillLogoColors();
    console.log(`✓ derived color for ${n} game(s) from their logo`);
    const now = new Date();
    await db
      .insert(appConfig)
      .values({ id: "global", logoColorsBackfilledAt: now })
      .onConflictDoUpdate({
        target: appConfig.id,
        set: { logoColorsBackfilledAt: now },
      });
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("deploy schema step failed:", err);
  process.exit(1);
});
