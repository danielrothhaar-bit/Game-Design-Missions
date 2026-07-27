"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  phaseTemplates,
  phaseTemplateTasks,
  phaseTemplateTaskSkills,
  phases,
  tasks,
  taskSkills,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";

const PriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const ScopeEnum = z.enum(["S", "M", "L", "XL"]);
const LevelEnum = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]);
const SkillsInput = z.array(
  z.object({ skillId: z.string(), level: LevelEnum }),
);

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

/* ─────────────────── template task rows ─────────────────── */

const AddInput = z.object({
  phaseTemplateId: z.string(),
  title: z.string().min(1).max(280),
  teamId: z.union([z.string(), z.null()]).optional(),
  priority: PriorityEnum.optional(),
  scopeSize: ScopeEnum.optional(),
  skills: SkillsInput.optional(),
});

export async function addPhaseTemplateTask(input: z.input<typeof AddInput>) {
  await requireAdmin();
  const { phaseTemplateId, title, teamId, priority, scopeSize, skills } =
    AddInput.parse(input);
  const maxRow = await db
    .select({ max: sql<number>`coalesce(max(${phaseTemplateTasks.order}), 0)` })
    .from(phaseTemplateTasks)
    .where(eq(phaseTemplateTasks.phaseTemplateId, phaseTemplateId));
  const [row] = await db
    .insert(phaseTemplateTasks)
    .values({
      phaseTemplateId,
      title,
      teamId: teamId ?? null,
      priority: priority ?? "MEDIUM",
      scopeSize: scopeSize ?? "M",
      order: (maxRow[0]?.max ?? 0) + 1,
    })
    .returning();
  if (skills && skills.length > 0) {
    await db.insert(phaseTemplateTaskSkills).values(
      skills.map((s) => ({
        templateTaskId: row.id,
        skillId: s.skillId,
        level: s.level,
      })),
    );
  }
  revalidatePath("/admin");
  return { id: row.id };
}

const UpdateInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(280).optional(),
  teamId: z.union([z.string(), z.null()]).optional(),
  priority: PriorityEnum.optional(),
  scopeSize: ScopeEnum.optional(),
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

export async function setPhaseTemplateTaskSkills(
  templateTaskId: string,
  skills: z.input<typeof SkillsInput>,
) {
  await requireAdmin();
  const parsed = SkillsInput.parse(skills);
  await db
    .delete(phaseTemplateTaskSkills)
    .where(eq(phaseTemplateTaskSkills.templateTaskId, templateTaskId));
  if (parsed.length > 0) {
    await db.insert(phaseTemplateTaskSkills).values(
      parsed.map((s) => ({
        templateTaskId,
        skillId: s.skillId,
        level: s.level,
      })),
    );
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function deletePhaseTemplateTask(id: string) {
  await requireAdmin();
  await db.delete(phaseTemplateTasks).where(eq(phaseTemplateTasks.id, id));
  revalidatePath("/admin");
  return { ok: true };
}

/* ─────────────────── template sections ─────────────────── */

const AddSectionInput = z.object({
  name: z.string().min(1).max(120),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#64748b"),
});

export async function addPhaseTemplate(input: z.input<typeof AddSectionInput>) {
  await requireAdmin();
  const { name, color } = AddSectionInput.parse(input);
  const maxRow = await db
    .select({ max: sql<number>`coalesce(max(${phaseTemplates.order}), -1)` })
    .from(phaseTemplates);
  const [row] = await db
    .insert(phaseTemplates)
    .values({ name, color, kind: "CUSTOM", order: (maxRow[0]?.max ?? -1) + 1 })
    .returning();
  revalidatePath("/admin");
  return { id: row.id };
}

const UpdateSectionInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(120).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function updatePhaseTemplate(
  input: z.input<typeof UpdateSectionInput>,
) {
  await requireAdmin();
  const { id, ...patch } = UpdateSectionInput.parse(input);
  await db.update(phaseTemplates).set(patch).where(eq(phaseTemplates.id, id));
  revalidatePath("/admin");
  return { ok: true };
}

export async function deletePhaseTemplate(id: string) {
  await requireAdmin();
  await db.delete(phaseTemplates).where(eq(phaseTemplates.id, id));
  revalidatePath("/admin");
  return { ok: true };
}

/* ─────────── apply templates into an existing game ─────────── */

async function findOrCreatePhase(
  gameId: string,
  tpl: { name: string; kind: string; color: string },
): Promise<string> {
  const existing = await db.query.phases.findFirst({
    where: (p) => and(eq(p.gameId, gameId), eq(p.name, tpl.name)),
  });
  if (existing) return existing.id;
  const maxRow = await db
    .select({ max: sql<number>`coalesce(max(${phases.order}), -1)` })
    .from(phases)
    .where(eq(phases.gameId, gameId));
  const [ph] = await db
    .insert(phases)
    .values({
      gameId,
      name: tpl.name,
      kind: tpl.kind as (typeof phases.$inferInsert)["kind"],
      color: tpl.color,
      order: (maxRow[0]?.max ?? -1) + 1,
    })
    .returning();
  return ph.id;
}

async function nextPosition(gameId: string): Promise<number> {
  const row = await db
    .select({ max: sql<number>`coalesce(max(${tasks.position}), -1)` })
    .from(tasks)
    .where(eq(tasks.gameId, gameId));
  return (row[0]?.max ?? -1) + 1;
}

type TemplateTaskRow = {
  title: string;
  teamId: string | null;
  priority: string;
  scopeSize: string;
  skills: { skillId: string; level: string }[];
};

/** Insert one real task (plus its skills) into a game/phase. */
async function insertTaskFromTemplate(
  gameId: string,
  phaseId: string,
  tt: TemplateTaskRow,
  position: number,
  userId: string,
) {
  const [task] = await db
    .insert(tasks)
    .values({
      gameId,
      phaseId,
      title: tt.title,
      teamId: tt.teamId ?? null,
      priority: tt.priority as (typeof tasks.$inferInsert)["priority"],
      scopeSize: tt.scopeSize,
      position,
      createdById: userId,
    })
    .returning();
  if (tt.skills.length > 0) {
    await db.insert(taskSkills).values(
      tt.skills.map((s) => ({
        taskId: task.id,
        skillId: s.skillId,
        level: s.level as (typeof taskSkills.$inferInsert)["level"],
      })),
    );
  }
  return task.id;
}

function normalizeTemplateTask(t: {
  title: string;
  teamId: string | null;
  priority: string;
  scopeSize: string;
  skills: { skillId: string; level: string }[];
}): TemplateTaskRow {
  return {
    title: t.title,
    teamId: t.teamId,
    priority: t.priority,
    scopeSize: t.scopeSize,
    skills: t.skills.map((s) => ({ skillId: s.skillId, level: s.level })),
  };
}

/** Create every task in a template section into the chosen game. */
export async function createTasksFromTemplate(
  gameId: string,
  phaseTemplateId: string,
) {
  const userId = await requireUser();
  const game = await db.query.games.findFirst({
    where: (g) => eq(g.id, gameId),
  });
  if (!game) throw new Error("Project not found");
  const tpl = await db.query.phaseTemplates.findFirst({
    where: eq(phaseTemplates.id, phaseTemplateId),
    with: {
      tasks: {
        orderBy: (t, { asc }) => [asc(t.order)],
        with: { skills: true },
      },
    },
  });
  if (!tpl) throw new Error("Template not found");

  const phaseId = await findOrCreatePhase(gameId, {
    name: tpl.name,
    kind: tpl.kind,
    color: tpl.color,
  });
  let pos = await nextPosition(gameId);
  for (const t of tpl.tasks) {
    await insertTaskFromTemplate(
      gameId,
      phaseId,
      normalizeTemplateTask(t),
      pos++,
      userId,
    );
  }
  revalidatePath(`/games/${game.slug}`);
  revalidatePath("/portfolio");
  revalidatePath("/", "layout");
  return { count: tpl.tasks.length, slug: game.slug };
}

/** Create a single template task into the chosen game. */
export async function createTaskFromTemplateTask(
  gameId: string,
  templateTaskId: string,
) {
  const userId = await requireUser();
  const game = await db.query.games.findFirst({
    where: (g) => eq(g.id, gameId),
  });
  if (!game) throw new Error("Project not found");
  const tt = await db.query.phaseTemplateTasks.findFirst({
    where: eq(phaseTemplateTasks.id, templateTaskId),
    with: { template: true, skills: true },
  });
  if (!tt || !tt.template) throw new Error("Template task not found");

  const phaseId = await findOrCreatePhase(gameId, {
    name: tt.template.name,
    kind: tt.template.kind,
    color: tt.template.color,
  });
  const pos = await nextPosition(gameId);
  await insertTaskFromTemplate(
    gameId,
    phaseId,
    normalizeTemplateTask(tt),
    pos,
    userId,
  );
  revalidatePath(`/games/${game.slug}`);
  revalidatePath("/portfolio");
  revalidatePath("/", "layout");
  return { slug: game.slug };
}
