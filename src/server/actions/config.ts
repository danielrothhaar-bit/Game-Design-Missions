"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appConfig, badges } from "@/db/schema";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    throw new Error("Admins only");
  }
}

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
});

export async function updateXpConfig(input: z.input<typeof XpConfigInput>) {
  await requireAdmin();
  const parsed = XpConfigInput.parse(input);
  await db
    .insert(appConfig)
    .values({ id: "global", ...parsed })
    .onConflictDoUpdate({ target: appConfig.id, set: parsed });
  // Affects every page that renders levels/XP.
  revalidatePath("/", "layout");
  return { ok: true };
}

const BadgeInput = z.object({
  code: z.string(),
  name: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(280).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
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
