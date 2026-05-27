"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { phaseTemplateTasks } from "@/db/schema";
import { requireAdmin } from "@/lib/authz";

const AddInput = z.object({
  phaseTemplateId: z.string(),
  title: z.string().min(1).max(280),
  teamId: z.union([z.string(), z.null()]).optional(),
});

export async function addPhaseTemplateTask(input: z.input<typeof AddInput>) {
  await requireAdmin();
  const { phaseTemplateId, title, teamId } = AddInput.parse(input);
  const maxRow = await db
    .select({ max: sql<number>`coalesce(max(${phaseTemplateTasks.order}), 0)` })
    .from(phaseTemplateTasks)
    .where(eq(phaseTemplateTasks.phaseTemplateId, phaseTemplateId));
  await db.insert(phaseTemplateTasks).values({
    phaseTemplateId,
    title,
    teamId: teamId ?? null,
    order: (maxRow[0]?.max ?? 0) + 1,
  });
  revalidatePath("/admin");
  return { ok: true };
}

const UpdateInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(280).optional(),
  teamId: z.union([z.string(), z.null()]).optional(),
});

export async function updatePhaseTemplateTask(
  input: z.input<typeof UpdateInput>,
) {
  await requireAdmin();
  const { id, ...patch } = UpdateInput.parse(input);
  await db
    .update(phaseTemplateTasks)
    .set(patch)
    .where(eq(phaseTemplateTasks.id, id));
  revalidatePath("/admin");
  return { ok: true };
}

export async function deletePhaseTemplateTask(id: string) {
  await requireAdmin();
  await db.delete(phaseTemplateTasks).where(eq(phaseTemplateTasks.id, id));
  revalidatePath("/admin");
  return { ok: true };
}
