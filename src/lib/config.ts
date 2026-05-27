import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appConfig } from "@/db/schema";
import { addBusinessDays } from "./dates";
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
    difficultyWeight: {
      BEGINNER: row.diffWeightBeginner,
      INTERMEDIATE: row.diffWeightIntermediate,
      ADVANCED: row.diffWeightAdvanced,
      EXPERT: row.diffWeightExpert,
    },
    scopeMult: {
      S: row.scopeMultS,
      M: row.scopeMultM,
      L: row.scopeMultL,
      XL: row.scopeMultXl,
    },
    priorityMult: {
      LOW: row.priorityMultLow,
      MEDIUM: row.priorityMultMedium,
      HIGH: row.priorityMultHigh,
      URGENT: row.priorityMultUrgent,
    },
  };
}

export type TaskDefaults = {
  autoDueDates: boolean;
  leadDays: Record<"URGENT" | "HIGH" | "MEDIUM" | "LOW", number>;
};

/** Reads task-creation defaults (auto due dates), ensuring the row exists. */
export async function getTaskDefaults(): Promise<TaskDefaults> {
  await getXpConfig(); // ensures the singleton row exists
  const row = await db.query.appConfig.findFirst({
    where: eq(appConfig.id, "global"),
  });
  return {
    autoDueDates: row?.autoDueDates ?? true,
    leadDays: {
      URGENT: row?.dueLeadUrgent ?? 2,
      HIGH: row?.dueLeadHigh ?? 7,
      MEDIUM: row?.dueLeadMedium ?? 14,
      LOW: row?.dueLeadLow ?? 30,
    },
  };
}

/**
 * A due date computed from a task's priority, or null if disabled. Lead times
 * count business days, so the date never lands on a weekend.
 */
export function dueDateFromPriority(
  priority: string,
  defaults: TaskDefaults,
): Date | null {
  if (!defaults.autoDueDates) return null;
  const days =
    defaults.leadDays[priority as keyof TaskDefaults["leadDays"]] ??
    defaults.leadDays.MEDIUM;
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return addBusinessDays(d, days);
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
