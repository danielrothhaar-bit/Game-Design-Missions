"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activities, games, phases, tasks, taskSkills } from "@/db/schema";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { getPhaseTemplates } from "@/db/phase-templates";

const UpdateInput = z.object({
  id: z.string(),
  statusSlug: z.string().max(40).optional(),
  launchDate: z.union([z.date(), z.null()]).optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.union([z.string(), z.null()]).optional(),
  leadUserId: z.union([z.string(), z.null()]).optional(),
});

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function updateGame(input: z.input<typeof UpdateInput>) {
  const userId = await requireUser();
  const parsed = UpdateInput.parse(input);
  const { id, ...patch } = parsed;

  const existing = await db.query.games.findFirst({ where: eq(games.id, id) });
  if (!existing) throw new Error("Game not found");

  await db.update(games).set(patch).where(eq(games.id, id));

  await db.insert(activities).values({
    entityType: "game",
    entityId: id,
    gameId: id,
    actorId: userId,
    verb: "UPDATED",
    payload: patch as Record<string, unknown>,
  });

  revalidatePath(`/games/${existing.slug}`);
  revalidatePath("/games");
  revalidatePath("/portfolio");
  revalidatePath("/", "layout"); // refresh sidebar (lead highlight, etc.)
  return { ok: true };
}

const CreateGameInput = z.object({
  name: z.string().min(1).max(120),
  statusSlug: z.string().max(40).default("NEW"),
  division: z.string().max(32).default("TEG_GAMES"),
  coverColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#7c3aed"),
  description: z.string().max(2000).optional(),
  launchDate: z.union([z.date(), z.null()]).optional(),
  fromTemplates: z.boolean().default(true),
});

export async function createGame(input: z.input<typeof CreateGameInput>) {
  const userId = await requireUser();
  const parsed = CreateGameInput.parse(input);

  // Ensure a unique slug.
  const base = slugify(parsed.name) || "game";
  let slug = base;
  for (let i = 2; ; i++) {
    const clash = await db.query.games.findFirst({
      where: eq(games.slug, slug),
    });
    if (!clash) break;
    slug = `${base}-${i}`;
  }

  const [game] = await db
    .insert(games)
    .values({
      name: parsed.name,
      slug,
      statusSlug: parsed.statusSlug,
      division: parsed.division,
      coverColor: parsed.coverColor,
      description: parsed.description,
      launchDate: parsed.launchDate ?? null,
      createdById: userId,
    })
    .returning();

  if (parsed.fromTemplates) {
    const templates = await getPhaseTemplates();
    let position = 0;
    for (const [i, tpl] of templates.entries()) {
      const [phase] = await db
        .insert(phases)
        .values({
          gameId: game.id,
          name: tpl.name,
          kind: tpl.kind,
          color: tpl.color,
          order: i,
        })
        .returning();
      if (tpl.tasks.length) {
        const created = await db
          .insert(tasks)
          .values(
            tpl.tasks.map((t) => ({
              gameId: game.id,
              phaseId: phase.id,
              title: t.title,
              teamId: t.teamId ?? null,
              priority: t.priority,
              scopeSize: t.scopeSize,
              position: position++,
              createdById: userId,
            })),
          )
          .returning();
        // Copy each template task's skills onto the freshly-created task
        // (same array order as the insert above).
        const skillRows = created.flatMap((task, idx) =>
          tpl.tasks[idx].skills.map((s) => ({
            taskId: task.id,
            skillId: s.skillId,
            level: s.level,
          })),
        );
        if (skillRows.length > 0) {
          await db.insert(taskSkills).values(skillRows);
        }
      }
    }
  }

  await db.insert(activities).values({
    entityType: "game",
    entityId: game.id,
    gameId: game.id,
    actorId: userId,
    verb: "CREATED",
  });

  revalidatePath("/games");
  revalidatePath("/portfolio");
  revalidatePath("/", "layout");
  return { slug: game.slug };
}

/**
 * Set (or clear) a project's uploaded icon. The image arrives as a data URL
 * from the client (already resized) and is stored on the game row, so it
 * survives on Railway's ephemeral filesystem the way a /public file wouldn't.
 */
const CoverInput = z.object({
  id: z.string(),
  // A resized image data URL, or null to clear it.
  coverImage: z
    .union([
      z.string().startsWith("data:image/").max(1_500_000),
      z.null(),
    ])
    .optional(),
  // Optional cover color derived from the uploaded logo (its most prominent
  // non-black/white color).
  coverColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function updateGameCover(input: z.input<typeof CoverInput>) {
  await requireUser();
  const { id, coverImage, coverColor } = CoverInput.parse(input);
  const existing = await db.query.games.findFirst({ where: eq(games.id, id) });
  if (!existing) throw new Error("Project not found");
  const patch: { coverImage?: string | null; coverColor?: string } = {};
  if (coverImage !== undefined) patch.coverImage = coverImage ?? null;
  if (coverColor !== undefined) patch.coverColor = coverColor;
  await db.update(games).set(patch).where(eq(games.id, id));
  revalidatePath("/games");
  revalidatePath("/portfolio");
  revalidatePath(`/games/${existing.slug}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setGameArchived(id: string, archived: boolean) {
  const userId = await requireUser();
  const existing = await db.query.games.findFirst({ where: eq(games.id, id) });
  if (!existing) throw new Error("Project not found");
  await db
    .update(games)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(games.id, id));
  await db.insert(activities).values({
    entityType: "game",
    entityId: id,
    gameId: id,
    actorId: userId,
    verb: "UPDATED",
    payload: { archived },
  });
  revalidatePath("/games");
  revalidatePath("/portfolio");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Hard-delete a project and everything under it (phases/tasks cascade). */
export async function deleteGame(id: string) {
  await requireUser();
  const existing = await db.query.games.findFirst({ where: eq(games.id, id) });
  if (!existing) throw new Error("Project not found");
  await db.delete(games).where(eq(games.id, id));
  revalidatePath("/games");
  revalidatePath("/portfolio");
  revalidatePath("/", "layout");
  return { ok: true };
}
