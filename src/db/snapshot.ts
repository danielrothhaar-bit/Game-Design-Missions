import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * Tables whose contents are user-generated / editable (not hard-coded
 * reference data we can re-seed). These get snapshotted before every deploy
 * so a destructive schema change can never silently lose real data.
 */
const TABLES = [
  "game",
  "task",
  "user",
  "phase",
  "label",
  "task_assignee",
  "task_label",
  "task_skill",
  "dependency",
  "checklist_item",
  "comment",
  "mention",
  "attachment",
  "activity",
  "notification",
  "saved_view",
  "xp_event",
  "badge",
  "user_badge",
  "discipline_xp",
  "streak",
  "app_config",
  "team",
  "skill",
  "phase_template",
  "phase_template_task",
  "user_skill",
  "sidequest",
];

const KEEP = 10;

type Row = Record<string, unknown>;
function firstRow(res: unknown): Row | undefined {
  if (Array.isArray(res)) return res[0] as Row | undefined;
  const rows = (res as { rows?: Row[] }).rows;
  return rows?.[0];
}

/**
 * Writes a JSON snapshot of all user data into the `backup` table, pruning to
 * the most recent KEEP snapshots. Safe to run before the schema push — it
 * creates its own table and skips tables that don't exist yet.
 */
export async function snapshotData(reason = "pre-deploy"): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "backup" (
      id serial PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now(),
      reason varchar(80) NOT NULL DEFAULT 'pre-deploy',
      payload jsonb NOT NULL
    )
  `);

  const payload: Record<string, unknown> = {};
  let totalRows = 0;

  for (const table of TABLES) {
    const existsRes = await db.execute(
      sql`SELECT to_regclass(${"public." + table}) AS r`,
    );
    const reg = firstRow(existsRes)?.r;
    if (!reg) continue;

    const dataRes = await db.execute(
      sql`SELECT coalesce(json_agg(x), '[]'::json) AS data FROM ${sql.identifier(table)} x`,
    );
    const data = firstRow(dataRes)?.data ?? [];
    payload[table] = data;
    if (Array.isArray(data)) totalRows += data.length;
  }

  await db.execute(
    sql`INSERT INTO "backup" (reason, payload) VALUES (${reason}, ${JSON.stringify(payload)}::jsonb)`,
  );
  await db.execute(
    sql`DELETE FROM "backup" WHERE id NOT IN (SELECT id FROM "backup" ORDER BY id DESC LIMIT ${KEEP})`,
  );

  console.log(`✓ data snapshot saved (${totalRows} rows across tables)`);
}
