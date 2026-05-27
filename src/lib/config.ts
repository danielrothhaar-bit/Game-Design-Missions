import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appConfig } from "@/db/schema";
import { DEFAULT_TITLES, DEFAULT_XP_CONFIG, type XpConfig } from "./xp";

type ConfigRow = typeof appConfig.$inferSelect;

function rowToConfig(row: ConfigRow): XpConfig {
  return {
    xpPerPoint: row.xpPerPoint,
    onTimeMult: row.onTimeMult,
    earlyMult: row.earlyMult,
    lateMult: row.lateMult,
    assistPct: row.assistPct,
    levelBaseXp: row.levelBaseXp,
    reopenReversalDays: row.reopenReversalDays,
    titles: row.titles?.length ? row.titles : DEFAULT_TITLES,
  };
}

/**
 * Reads the singleton app config, creating it (with defaults) on first use.
 */
export async function getXpConfig(): Promise<XpConfig> {
  const existing = await db.query.appConfig.findFirst({
    where: eq(appConfig.id, "global"),
  });
  if (existing) return rowToConfig(existing);

  const [created] = await db
    .insert(appConfig)
    .values({
      id: "global",
      xpPerPoint: DEFAULT_XP_CONFIG.xpPerPoint,
      onTimeMult: DEFAULT_XP_CONFIG.onTimeMult,
      earlyMult: DEFAULT_XP_CONFIG.earlyMult,
      lateMult: DEFAULT_XP_CONFIG.lateMult,
      assistPct: DEFAULT_XP_CONFIG.assistPct,
      levelBaseXp: DEFAULT_XP_CONFIG.levelBaseXp,
      reopenReversalDays: DEFAULT_XP_CONFIG.reopenReversalDays,
      titles: DEFAULT_XP_CONFIG.titles,
    })
    .onConflictDoNothing()
    .returning();

  return created ? rowToConfig(created) : DEFAULT_XP_CONFIG;
}
