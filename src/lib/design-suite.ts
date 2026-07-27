import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  appConfig,
  designSuiteUserMap,
  games,
  taskAssignees,
  tasks,
  users,
} from "@/db/schema";

/**
 * Integration with the Game Design Suite app (the other site).
 *
 * Direction (Model B): action items are BORN in Design Suite and seeded here as
 * tasks. Quests then OWNS each task's lifecycle — when its status changes here,
 * we write the status back so Design Suite shows it (read-only) and links to the
 * task in Quests.
 *
 * server-only: this module reads DESIGN_SUITE_KEY and must never reach a client
 * bundle.
 */

// Strip any trailing slash: a trailing slash would make `${BASE}/api/...`
// a double slash, which the Design Suite server routes to its SPA (HTML)
// instead of the API, breaking res.json().
const BASE = (process.env.DESIGN_SUITE_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.DESIGN_SUITE_KEY ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export function designSuiteConfigured() {
  return Boolean(BASE && KEY);
}

type DesignSuiteAction = {
  ref: string; // "<designSuiteGameId>:<actionId>" — stable idempotent key
  id: string;
  gameId: string;
  gameName: string;
  description: string;
  assignee: string;
  status: string;
  dueDate: string;
  completedAt: string | null;
  updatedAt: string | null;
  handedOff: boolean;
  pmTaskId: string | null;
  pmUrl: string | null;
};

type QuestsStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "BLOCKED" | "DONE";

// Design Suite status vocabulary -> Quests. ('To Do' is a legacy value that
// createActionForCard seeds over there.)
const STATUS_TO_QUESTS: Record<string, QuestsStatus> = {
  "Not Started": "TODO",
  "To Do": "TODO",
  "In Progress": "IN_PROGRESS",
  Blocked: "BLOCKED",
  Done: "DONE",
};
function statusToQuests(s: string): QuestsStatus {
  return STATUS_TO_QUESTS[s] ?? "TODO";
}

// Quests status -> Design Suite. Quests' IN_REVIEW has no counterpart, so it
// maps to the closest open state.
const STATUS_TO_DESIGN_SUITE: Record<string, string> = {
  TODO: "Not Started",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};
function statusToDesignSuite(s: string): string {
  return STATUS_TO_DESIGN_SUITE[s] ?? "Not Started";
}

async function dsFetch(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "X-Service-Key": KEY,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

/**
 * Push a Quests task's status back to its originating Design Suite action.
 * No-op when the integration isn't configured. Never throws — a Design Suite
 * outage must not break task updates in Quests.
 */
export async function writeStatusToDesignSuite(
  ref: string,
  questsStatus: string,
) {
  if (!designSuiteConfigured()) return;
  const idx = ref.indexOf(":");
  if (idx < 0) return;
  const gameId = ref.slice(0, idx);
  const actionId = ref.slice(idx + 1);
  if (!gameId || !actionId) return;
  try {
    const res = await dsFetch(`/api/games/${gameId}/actions/${actionId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: statusToDesignSuite(questsStatus) }),
    });
    if (!res.ok) {
      console.error(
        `[design-suite] status writeback ${ref} failed: ${res.status}`,
      );
    }
  } catch (err) {
    console.error(`[design-suite] status writeback ${ref} error:`, err);
  }
}

// Resolve the Design Suite action's game to a Quests game: prefer an explicit
// link, else auto-match by name (case-insensitive) and record the link. Returns
// null when there's no match (the action is then reported as skipped).
async function resolveGame(a: DesignSuiteAction) {
  const linked = await db.query.games.findFirst({
    where: eq(games.designSuiteGameId, a.gameId),
  });
  if (linked) return linked;

  const byName = await db.query.games.findFirst({
    where: sql`lower(${games.name}) = lower(${a.gameName})`,
  });
  if (byName && !byName.designSuiteGameId) {
    await db
      .update(games)
      .set({ designSuiteGameId: a.gameId })
      .where(eq(games.id, byName.id));
    return { ...byName, designSuiteGameId: a.gameId };
  }
  return null;
}

// Flip the Design Suite action to "handed off" (read-only status + deep link to
// the Quests task) unless it already points here.
async function ensureHandoff(
  a: DesignSuiteAction,
  taskId: string,
  slug: string,
) {
  const pmUrl = `${APP_URL}/games/${slug}?task=${taskId}`;
  if (a.handedOff && a.pmTaskId === taskId && a.pmUrl === pmUrl) return;
  try {
    const res = await dsFetch(`/api/games/${a.gameId}/actions/${a.id}`, {
      method: "PATCH",
      body: JSON.stringify({ handedOff: true, pmTaskId: taskId, pmUrl }),
    });
    if (!res.ok) {
      console.error(`[design-suite] handoff ${a.ref} failed: ${res.status}`);
    }
  } catch (err) {
    console.error(`[design-suite] handoff ${a.ref} error:`, err);
  }
}

export type SyncSummary = {
  pulled: number;
  created: number;
  updated: number;
  assigned: number;
  skippedNoGame: string[];
};

/**
 * Pull changed actions from Design Suite and upsert them as Quests tasks.
 *
 * - Content (title/description/due) flows Design Suite -> Quests on every pull.
 * - Status flows Quests -> Design Suite (owned here); we seed it only on create
 *   and never overwrite it on later pulls.
 * - Upsert is keyed by tasks.designSuiteRef, so re-running is idempotent.
 */
export async function runDesignSuiteSync(): Promise<SyncSummary> {
  if (!designSuiteConfigured()) {
    throw new Error(
      "Design Suite integration not configured (set DESIGN_SUITE_URL and DESIGN_SUITE_KEY).",
    );
  }

  const cfg = await db.query.appConfig.findFirst();
  const since = cfg?.designSuiteSyncCursor ?? null;
  const url = `/api/actions${since ? `?since=${encodeURIComponent(since.toISOString())}` : ""}`;

  const res = await dsFetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`Design Suite pull failed: HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `Design Suite pull returned ${contentType || "an unknown content type"}, not JSON — check that DESIGN_SUITE_URL points at the API host.`,
    );
  }
  const { actions, serverTime } = (await res.json()) as {
    actions: DesignSuiteAction[];
    serverTime: string;
  };

  const mapRows = await db.select().from(designSuiteUserMap);
  const emailByName = new Map(mapRows.map((r) => [r.designSuiteName, r.email]));

  const summary: SyncSummary = {
    pulled: actions.length,
    created: 0,
    updated: 0,
    assigned: 0,
    skippedNoGame: [],
  };

  for (const a of actions) {
    const gameRow = await resolveGame(a);
    if (!gameRow) {
      summary.skippedNoGame.push(`${a.gameName} — ${a.description || a.id}`);
      continue;
    }

    let assigneeUserId: string | null = null;
    if (a.assignee) {
      const email = emailByName.get(a.assignee);
      if (email) {
        const u = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        assigneeUserId = u?.id ?? null;
      }
    }

    const title = (a.description || "Untitled action").slice(0, 280);
    const description =
      a.description && a.description.length > 280 ? a.description : null;
    const dueDate = a.dueDate ? new Date(a.dueDate) : null;

    const existing = await db.query.tasks.findFirst({
      where: eq(tasks.designSuiteRef, a.ref),
    });

    if (existing) {
      // Content synced from Design Suite; status is owned by Quests, so it is
      // deliberately NOT part of this update.
      await db
        .update(tasks)
        .set({ title, description, dueDate, updatedAt: new Date() })
        .where(eq(tasks.id, existing.id));
      summary.updated++;
      await ensureHandoff(a, existing.id, gameRow.slug);
      continue;
    }

    const maxPosRow = await db
      .select({ max: sql<number>`coalesce(max(${tasks.position}), 0)` })
      .from(tasks)
      .where(eq(tasks.gameId, gameRow.id));
    const nextPos = (maxPosRow[0]?.max ?? 0) + 1;

    const [created] = await db
      .insert(tasks)
      .values({
        gameId: gameRow.id,
        title,
        description,
        status: statusToQuests(a.status),
        dueDate,
        completedAt: a.completedAt ? new Date(a.completedAt) : null,
        position: nextPos,
        designSuiteRef: a.ref,
      })
      .returning();
    summary.created++;

    if (assigneeUserId) {
      await db
        .insert(taskAssignees)
        .values({ taskId: created.id, userId: assigneeUserId, isPrimary: true })
        .onConflictDoNothing();
      summary.assigned++;
    }

    await db.insert(activities).values({
      entityType: "task",
      entityId: created.id,
      gameId: gameRow.id,
      verb: "CREATED",
      payload: { source: "design-suite", ref: a.ref },
    });

    await ensureHandoff(a, created.id, gameRow.slug);
  }

  // Advance the cursor to the server's clock (avoids client/server skew).
  await db
    .insert(appConfig)
    .values({ id: "global", designSuiteSyncCursor: new Date(serverTime) })
    .onConflictDoUpdate({
      target: appConfig.id,
      set: { designSuiteSyncCursor: new Date(serverTime) },
    });

  return summary;
}
