"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { requireAdmin } from "@/lib/authz";
import { slugify } from "@/lib/format";

const CreateSkill = z.object({
  name: z.string().min(1).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#a855f7"),
});

export async function createSkill(input: z.input<typeof CreateSkill>) {
  await requireAdmin();
  const { name, color } = CreateSkill.parse(input);
  const slug = slugify(name);
  const existing = await db.query.skills.findFirst({
    where: eq(skills.slug, slug),
  });
  if (existing) throw new Error("A skill with that name already exists.");
  const max = await db.query.skills.findMany({
    orderBy: (s, { desc }) => [desc(s.order)],
    limit: 1,
  });
  await db.insert(skills).values({
    name,
    slug,
    color,
    order: (max[0]?.order ?? 0) + 1,
  });
  revalidatePath("/admin");
  return { ok: true };
}

const UpdateSkill = z.object({
  id: z.string(),
  name: z.string().min(1).max(80).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  archived: z.boolean().optional(),
  promotionThreshold: z.number().int().min(1).max(100000).optional(),
});

export async function updateSkill(input: z.input<typeof UpdateSkill>) {
  await requireAdmin();
  const { id, ...patch } = UpdateSkill.parse(input);
  await db.update(skills).set(patch).where(eq(skills.id, id));
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteSkill(id: string) {
  await requireAdmin();
  await db.delete(skills).where(eq(skills.id, id));
  revalidatePath("/admin");
  return { ok: true };
}
