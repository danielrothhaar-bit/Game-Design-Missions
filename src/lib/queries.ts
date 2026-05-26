import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { games, users } from "@/db/schema";

export async function listGames() {
  return db.query.games.findMany({
    orderBy: [desc(games.createdAt)],
  });
}

export async function getGameBySlug(slug: string) {
  return db.query.games.findFirst({
    where: eq(games.slug, slug),
    with: {
      phases: { orderBy: (p, { asc }) => [asc(p.order)] },
      labels: true,
    },
  });
}

export async function listUsers() {
  return db.query.users.findMany({
    orderBy: (u, { asc }) => [asc(u.name)],
  });
}

export async function getUser(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

export async function getTasksForGame(gameId: string) {
  return db.query.tasks.findMany({
    where: (t, { eq: eqOp }) => eqOp(t.gameId, gameId),
    orderBy: (t, { asc }) => [asc(t.position), asc(t.createdAt)],
    with: {
      assignees: { with: { user: true } },
      labels: { with: { label: true } },
      phase: true,
    },
  });
}
