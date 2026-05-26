import { eq } from "drizzle-orm";
import { db } from "./index";
import { games, labels, phases, users } from "./schema";
import {
  STANDARD_LABELS,
  STANDARD_PHASES,
  TEG_GAMES,
} from "./games-catalog";

async function pickCreatorId(): Promise<string | null> {
  const first = await db.query.users.findFirst({
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
  return first?.id ?? null;
}

async function ensureGame(
  g: (typeof TEG_GAMES)[number],
  createdById: string | null,
) {
  const existing = await db.query.games.findFirst({
    where: eq(games.slug, g.slug),
  });
  if (existing) {
    console.log(`✓ ${g.name} (exists)`);
    return existing;
  }

  const [created] = await db
    .insert(games)
    .values({
      name: g.name,
      slug: g.slug,
      status: "LAUNCHED",
      coverColor: g.coverColor,
      createdById,
    })
    .returning();

  await db.insert(phases).values(
    STANDARD_PHASES.map((p, i) => ({
      gameId: created.id,
      name: p.name,
      kind: p.kind,
      color: p.color,
      order: i,
    })),
  );

  await db.insert(labels).values(
    STANDARD_LABELS.map((l) => ({
      gameId: created.id,
      name: l.name,
      color: l.color,
    })),
  );

  console.log(`+ ${g.name}`);
  return created;
}

/**
 * Idempotently inserts the TEG game catalog (+ standard phases and labels).
 * Existing games (matched by slug) are skipped, so this is safe to run
 * repeatedly and against a database that already has some games.
 */
export async function seedGamesCatalog(): Promise<void> {
  const userCount = await db.$count(users);
  console.log(`(found ${userCount} existing users)`);

  const createdById = await pickCreatorId();
  if (!createdById) {
    console.log("→ no users yet — games will be unowned until someone signs in");
  }

  for (const g of TEG_GAMES) {
    await ensureGame(g, createdById);
  }

  console.log(`✓ catalog populated (${TEG_GAMES.length} games)`);
}
