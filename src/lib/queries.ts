import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { games, users } from "@/db/schema";

export async function listTeams() {
  return db.query.teams.findMany({
    orderBy: (t, { asc }) => [asc(t.order), asc(t.name)],
  });
}

export async function listGameStatuses() {
  return db.query.gameStatusOptions.findMany({
    orderBy: (s, { asc }) => [asc(s.order), asc(s.label)],
  });
}

export async function listDivisions() {
  return db.query.divisions.findMany({
    orderBy: (d, { asc }) => [asc(d.order), asc(d.label)],
  });
}

export async function hiddenDivisionsForUser(userId: string) {
  const rows = await db.query.userDivisions.findMany({
    where: (ud, { eq: eqOp, and }) =>
      and(eqOp(ud.userId, userId), eqOp(ud.hidden, true)),
  });
  return new Set(rows.map((r) => r.divisionSlug));
}

export async function listSkills(includeArchived = false) {
  return db.query.skills.findMany({
    where: includeArchived ? undefined : (s, { eq: eqOp }) => eqOp(s.archived, false),
    orderBy: (s, { asc }) => [asc(s.order), asc(s.name)],
  });
}

export async function listGames() {
  return db.query.games.findMany({
    where: (g, { ne }) => ne(g.kind, "SIDEQUEST"),
    orderBy: [desc(games.createdAt)],
  });
}

export async function listSidequests() {
  return db.query.games.findMany({
    where: (g, { eq: eqOp }) => eqOp(g.kind, "SIDEQUEST"),
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
      team: true,
      skills: { with: { skill: true } },
      createdBy: true,
    },
  });
}
