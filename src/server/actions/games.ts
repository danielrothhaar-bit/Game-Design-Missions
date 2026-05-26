"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activities, games } from "@/db/schema";
import { auth } from "@/lib/auth";

const GameStatusEnum = z.enum([
  "CONCEPT",
  "IN_DESIGN",
  "IN_BUILD",
  "IN_TESTING",
  "LAUNCHED",
  "RETIRED",
]);

const UpdateInput = z.object({
  id: z.string(),
  status: GameStatusEnum.optional(),
  launchDate: z.union([z.date(), z.null()]).optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.union([z.string(), z.null()]).optional(),
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
  return { ok: true };
}
