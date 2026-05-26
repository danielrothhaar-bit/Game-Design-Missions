import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * postgres-js does not open a connection on `postgres(url)` — it lazily
 * connects on first query. That lets us fall back to a placeholder URL
 * during the build phase (Railway only injects DATABASE_URL at deploy
 * time, not build time). At runtime, the real `DATABASE_URL` is always
 * present; if it isn't, the first query will fail with a clear error.
 */
const url =
  process.env.DATABASE_URL ??
  "postgres://placeholder:placeholder@localhost:5432/placeholder_build_only";

const globalForDb = globalThis as unknown as {
  __quests_pg: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb.__quests_pg ??
  postgres(url, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__quests_pg = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Db = typeof db;
