"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activities, games, phases, tasks } from "@/db/schema";
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
  revalidatePath("/dashboard");
  revalidatePath("/", "layout"); // refresh sidebar (lead highlight, etc.)
  return { ok: true };
}

const CreateGameInput = z.object({
  name: z.string().min(1).max(120),
  statusSlug: z.string().max(40).default("NEW"),
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
        await db.insert(tasks).values(
          tpl.tasks.map((t) => ({
            gameId: game.id,
            phaseId: phase.id,
            title: t.title,
            teamId: t.teamId ?? null,
            position: position++,
            createdById: userId,
          })),
        );
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
  revalidatePath("/dashboard");
  return { slug: game.slug };
}

const CreateSidequestInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  coverColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0ea5e9"),
});

export async function createSidequest(
  input: z.input<typeof CreateSidequestInput>,
) {
  const userId = await requireUser();
  const parsed = CreateSidequestInput.parse(input);

  const base = slugify(parsed.name) || "sidequest";
  let slug = base;
  for (let i = 2; ; i++) {
    const clash = await db.query.games.findFirst({
      where: eq(games.slug, slug),
    });
    if (!clash) break;
    slug = `${base}-${i}`;
  }

  const [sq] = await db
    .insert(games)
    .values({
      name: parsed.name,
      slug,
      kind: "SIDEQUEST",
      statusSlug: "OPEN",
      coverColor: parsed.coverColor,
      description: parsed.description,
      createdById: userId,
    })
    .returning();

  await db.insert(activities).values({
    entityType: "game",
    entityId: sq.id,
    gameId: sq.id,
    actorId: userId,
    verb: "CREATED",
  });

  revalidatePath("/", "layout");
  return { slug: sq.slug };
}
