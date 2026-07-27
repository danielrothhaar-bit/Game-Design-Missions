-- Game Design Suite integration — additive schema changes only.
--
-- NOTE: Quests' schema is maintained with `db:push`, and its drizzle migration
-- snapshot is stale, so DO NOT run `drizzle-kit generate/migrate` for this — it
-- produces a bogus full-recreate diff. Apply this file directly, or run
-- `npm run db:push` (which will detect exactly these four additive changes).
--
-- Safe to re-run (all statements are guarded).

-- 1. Idempotent link from a Quests task back to its Design Suite action.
ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "design_suite_ref" text;
DO $$ BEGIN
  ALTER TABLE "task" ADD CONSTRAINT "task_design_suite_ref_unique" UNIQUE ("design_suite_ref");
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- 2. Link a Quests game/project to a Design Suite game.
ALTER TABLE "game" ADD COLUMN IF NOT EXISTS "design_suite_game_id" text;
DO $$ BEGIN
  ALTER TABLE "game" ADD CONSTRAINT "game_design_suite_game_id_unique" UNIQUE ("design_suite_game_id");
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- 3. Incremental-pull cursor for the sync.
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "design_suite_sync_cursor" timestamp with time zone;

-- 4. Assignee name -> email map (Design Suite stores assignee as a name string).
CREATE TABLE IF NOT EXISTS "design_suite_user_map" (
  "design_suite_name" varchar(120) PRIMARY KEY NOT NULL,
  "email" text NOT NULL
);
