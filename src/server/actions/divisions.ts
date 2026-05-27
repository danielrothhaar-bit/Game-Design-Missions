"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { divisions, games } from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { slugify } from "@/lib/format";

const CreateInput = z.object({
  label: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#7c3aed"),
});

export async function createDivision(input: z.input<typeof CreateInput>) {
  await requireAdmin();
  const { label, color } = CreateInput.parse(input);
  const slug = slugify(label).toUpperCase().replace(/-/g, "_") || "DIVISION";
  const existing = await db.query.divisions.findFirst({
    where: eq(divisions.slug, slug),
  });
  if (existing) throw new Error("A division with that name already exists.");
  const max = await db.query.divisions.findMany({
    orderBy: (d, { desc }) => [desc(d.order)],
    limit: 1,
  });
  await db
    .insert(divisions)
    .values({ slug, label, color, order: (max[0]?.order ?? 0) + 1 });
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

const UpdateInput = z.object({
  slug: z.string(),
  label: z.string().min(1).max(60).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function updateDivision(input: z.input<typeof UpdateInput>) {
  await requireAdmin();
  const { slug, ...patch } = UpdateInput.parse(input);
  await db.update(divisions).set(patch).where(eq(divisions.slug, slug));
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteDivision(slug: string) {
  await requireAdmin();
  const inUse = await db.query.games.findFirst({
    where: eq(games.division, slug),
  });
  if (inUse) {
    throw new Error(
      "This division has projects. Move them to another division first.",
    );
  }
  await db.delete(divisions).where(eq(divisions.slug, slug));
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function moveDivision(slug: string, dir: "up" | "down") {
  await requireAdmin();
  const all = await db.query.divisions.findMany({
    orderBy: (d, { asc }) => [asc(d.order)],
  });
  const idx = all.findIndex((d) => d.slug === slug);
  if (idx < 0) return { ok: true };
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= all.length) return { ok: true };
  const a = all[idx];
  const b = all[swapWith];
  await db.update(divisions).set({ order: b.order }).where(eq(divisions.slug, a.slug));
  await db.update(divisions).set({ order: a.order }).where(eq(divisions.slug, b.slug));
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}
