"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appConfig, badges } from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { slugify } from "@/lib/format";

const weight = z.number().int().min(0).max(100000);
const XpConfigInput = z.object({
  xpPerPoint: z.number().int().min(1).max(1000),
  onTimeMult: z.number().int().min(0).max(1000),
  earlyMult: z.number().int().min(0).max(1000),
  lateMult: z.number().int().min(0).max(1000),
  assistPct: z.number().int().min(0).max(1000),
  levelBaseXp: z.number().int().min(10).max(100000),
  reopenReversalDays: z.number().int().min(0).max(365),
  titles: z
    .array(z.object({ from: z.number().int().min(1), title: z.string().min(1).max(40) }))
    .min(1),
  difficultyWeight: z.object({
    BEGINNER: weight,
    INTERMEDIATE: weight,
    ADVANCED: weight,
    EXPERT: weight,
  }),
  scopeMult: z.object({
    S: weight,
    M: weight,
    L: weight,
    XL: weight,
  }),
  priorityMult: z.object({
    LOW: weight,
    MEDIUM: weight,
    HIGH: weight,
    URGENT: weight,
  }),
});

export async function updateXpConfig(input: z.input<typeof XpConfigInput>) {
  await requireAdmin();
  const p = XpConfigInput.parse(input);
  // Flatten the nested weight tables into the app_config columns.
  const row = {
    xpPerPoint: p.xpPerPoint,
    onTimeMult: p.onTimeMult,
    earlyMult: p.earlyMult,
    lateMult: p.lateMult,
    assistPct: p.assistPct,
    levelBaseXp: p.levelBaseXp,
    reopenReversalDays: p.reopenReversalDays,
    titles: p.titles,
    diffWeightBeginner: p.difficultyWeight.BEGINNER,
    diffWeightIntermediate: p.difficultyWeight.INTERMEDIATE,
    diffWeightAdvanced: p.difficultyWeight.ADVANCED,
    diffWeightExpert: p.difficultyWeight.EXPERT,
    scopeMultS: p.scopeMult.S,
    scopeMultM: p.scopeMult.M,
    scopeMultL: p.scopeMult.L,
    scopeMultXl: p.scopeMult.XL,
    priorityMultLow: p.priorityMult.LOW,
    priorityMultMedium: p.priorityMult.MEDIUM,
    priorityMultHigh: p.priorityMult.HIGH,
    priorityMultUrgent: p.priorityMult.URGENT,
  };
  await db
    .insert(appConfig)
    .values({ id: "global", ...row })
    .onConflictDoUpdate({ target: appConfig.id, set: row });
  // Affects every page that renders levels/XP.
  revalidatePath("/", "layout");
  return { ok: true };
}

const TaskDefaultsInput = z.object({
  autoDueDates: z.boolean(),
  dueLeadUrgent: z.number().int().min(0).max(3650),
  dueLeadHigh: z.number().int().min(0).max(3650),
  dueLeadMedium: z.number().int().min(0).max(3650),
  dueLeadLow: z.number().int().min(0).max(3650),
});

export async function updateTaskDefaults(
  input: z.input<typeof TaskDefaultsInput>,
) {
  await requireAdmin();
  const parsed = TaskDefaultsInput.parse(input);
  await db
    .insert(appConfig)
    .values({ id: "global", ...parsed })
    .onConflictDoUpdate({ target: appConfig.id, set: parsed });
  revalidatePath("/admin");
  return { ok: true };
}

const BadgeInput = z.object({
  code: z.string(),
  name: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(280).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  imageUrl: z.union([z.string().max(500000), z.null()]).optional(),
  threshold: z.number().int().min(1).max(100000).optional(),
});

export async function updateBadge(input: z.input<typeof BadgeInput>) {
  await requireAdmin();
  const { code, threshold, ...rest } = BadgeInput.parse(input);

  const existing = await db.query.badges.findFirst({
    where: eq(badges.code, code),
  });
  if (!existing) throw new Error("Badge not found");

  const criteria =
    threshold !== undefined
      ? { ...(existing.criteria ?? {}), threshold }
      : existing.criteria;

  await db
    .update(badges)
    .set({ ...rest, criteria })
    .where(eq(badges.code, code));
  revalidatePath("/admin");
  return { ok: true };
}

const CRITERIA_TYPES = [
  "TASK_CLOSED_COUNT",
  "ON_TIME_CLOSES",
  "DISCIPLINE_CLOSES",
  "STREAK",
] as const;

const CreateBadgeInput = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(280),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#7c3aed"),
  criteriaType: z.enum(CRITERIA_TYPES),
  threshold: z.number().int().min(1).max(100000).default(1),
  discipline: z.string().optional(),
});

export async function createBadge(input: z.input<typeof CreateBadgeInput>) {
  await requireAdmin();
  const parsed = CreateBadgeInput.parse(input);
  const code = slugify(parsed.name);
  if (!code) throw new Error("Invalid badge name");

  const existing = await db.query.badges.findFirst({
    where: eq(badges.code, code),
  });
  if (existing) throw new Error("A badge with that name already exists.");

  const criteria: Record<string, unknown> = {
    type: parsed.criteriaType,
    threshold: parsed.threshold,
  };
  if (parsed.criteriaType === "DISCIPLINE_CLOSES" && parsed.discipline) {
    criteria.discipline = parsed.discipline;
  }

  await db.insert(badges).values({
    code,
    name: parsed.name,
    description: parsed.description,
    icon: "Award",
    color: parsed.color,
    criteria,
  });
  revalidatePath("/admin");
  return { ok: true };
}
