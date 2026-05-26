import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * Hard reset: drops everything in the public schema and recreates it empty.
 * Destructive — only for local dev or recovering a broken database.
 */
async function main() {
  console.log("⚠ dropping public schema (all tables + data)");
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  console.log("✓ database reset — schema is now empty");
  process.exit(0);
}

main().catch((err) => {
  console.error("reset failed:", err);
  process.exit(1);
});
