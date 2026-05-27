"use server";

import { revalidatePath } from "next/cache";
import { eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { gameStatusOptions, games } from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { slugify } from "@/lib/format";

const CreateInput = z.object({
  label: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#3b82f6"),
});

export async function createGameStatus(input: z.input<typeof CreateInput>) {
  await requireAdmin();
  const { label, color } = CreateInput.parse(input);
  const slug = slugify(label).toUpperCase().replace(/-/g, "_") || "STATUS";
  const existing = await db.query.gameStatusOptions.findFirst({
    where: eq(gameStatusOptions.slug, slug),
  });
  if (existing) throw new Error("A status with that name already exists.");
  const max = await db.query.gameStatusOptions.findMany({
    orderBy: (s, { desc }) => [desc(s.order)],
    limit: 1,
  });
  await db
    .insert(gameStatusOptions)
    .values({ slug, label, color, order: (max[0]?.order ?? 0) + 1 });
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

const UpdateInput = z.object({
  slug: z.string(),
  label: z.string().min(1).max(60).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  order: z.number().int().optional(),
});

export async function updateGameStatus(input: z.input<typeof UpdateInput>) {
  await requireAdmin();
  const { slug, ...patch } = UpdateInput.parse(input);
  await db
    .update(gameStatusOptions)
    .set(patch)
    .where(eq(gameStatusOptions.slug, slug));
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteGameStatus(slug: string) {
  await requireAdmin();
  // Block deletion while any game uses this status.
  const inUse = await db.query.games.findFirst({
    where: or(eq(games.statusSlug, slug), eq(games.status, sql`${slug}`)),
  });
  if (inUse) {
    throw new Error(
      "This status is in use by one or more games. Reassign them first.",
    );
  }
  await db.delete(gameStatusOptions).where(eq(gameStatusOptions.slug, slug));
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Move a status up/down in the ordering. */
export async function moveGameStatus(slug: string, dir: "up" | "down") {
  await requireAdmin();
  const all = await db.query.gameStatusOptions.findMany({
    orderBy: (s, { asc }) => [asc(s.order)],
  });
  const idx = all.findIndex((s) => s.slug === slug);
  if (idx < 0) return { ok: true };
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= all.length) return { ok: true };
  const a = all[idx];
  const b = all[swapWith];
  await db
    .update(gameStatusOptions)
    .set({ order: b.order })
    .where(eq(gameStatusOptions.slug, a.slug));
  await db
    .update(gameStatusOptions)
    .set({ order: a.order })
    .where(eq(gameStatusOptions.slug, b.slug));
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}
