"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  activities,
  disciplineXp,
  notifications,
  streaks,
  taskAssignees,
  taskSkills,
  tasks,
  userBadges,
  users,
  xpEvents,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  applyMultiplier,
  levelFromXp,
  multiplierFor,
  xpForTaskClose,
  type XpConfig,
} from "@/lib/xp";
import { getXpConfig } from "@/lib/config";

const TaskStatusEnum = z.enum([
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE",
]);

const TaskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

const UpdateInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(280).optional(),
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  estimate: z.number().int().min(1).max(100).optional(),
  dueDate: z.union([z.date(), z.null()]).optional(),
  blockedReason: z.union([z.string(), z.null()]).optional(),
});

export async function updateTaskFields(input: z.input<typeof UpdateInput>) {
  const userId = await requireUser();
  const parsed = UpdateInput.parse(input);
  const { id, ...patch } = parsed;

  const current = await db.query.tasks.findFirst({
    where: eq(tasks.id, id),
    with: { game: true },
  });
  if (!current) throw new Error("Task not found");

  // Estimate locks once In Progress
  if (
    patch.estimate !== undefined &&
    current.estimateLocked &&
    patch.estimate !== current.estimate
  ) {
    throw new Error("Estimate is locked after work has started.");
  }

  const movingToInProgress =
    patch.status === "IN_PROGRESS" && current.status === "TODO";
  const closing = patch.status === "DONE" && current.status !== "DONE";
  const reopening = current.status === "DONE" && patch.status && patch.status !== "DONE";

  const updateValues: Partial<typeof tasks.$inferInsert> = {
    ...patch,
    updatedAt: new Date(),
  };
  if (movingToInProgress) {
    updateValues.startedAt = new Date();
    updateValues.estimateLocked = true;
  }
  if (closing) {
    updateValues.completedAt = new Date();
    updateValues.closedById = userId;
  }
  if (reopening) {
    updateValues.completedAt = null;
    updateValues.closedById = null;
  }

  await db.update(tasks).set(updateValues).where(eq(tasks.id, id));

  if (closing) await awardCloseXp(id, userId);
  if (reopening) await reverseCloseXpIfRecent(id);

  await db.insert(activities).values({
    entityType: "task",
    entityId: id,
    gameId: current.gameId,
    actorId: userId,
    verb: closing
      ? "CLOSED"
      : reopening
        ? "REOPENED"
        : patch.status
          ? "STATUS_CHANGED"
          : "UPDATED",
    payload: patch as Record<string, unknown>,
  });

  revalidatePath(`/games/${current.game.slug}`);
  revalidatePath("/my-work");
  revalidatePath("/dashboard");
  return { ok: true };
}

const CreateInput = z.object({
  gameId: z.string(),
  phaseId: z.string().optional(),
  title: z.string().min(1).max(280),
  priority: TaskPriorityEnum.default("MEDIUM"),
  estimate: z.number().int().min(1).max(100).default(1),
});

export async function createTask(input: z.input<typeof CreateInput>) {
  const userId = await requireUser();
  const parsed = CreateInput.parse(input);

  const gameRow = await db.query.games.findFirst({
    where: (g, { eq: eqOp }) => eqOp(g.id, parsed.gameId),
  });
  if (!gameRow) throw new Error("Game not found");

  const maxPosRow = await db
    .select({ max: sql<number>`coalesce(max(${tasks.position}), 0)` })
    .from(tasks)
    .where(eq(tasks.gameId, parsed.gameId));
  const nextPos = (maxPosRow[0]?.max ?? 0) + 1;

  const [created] = await db
    .insert(tasks)
    .values({
      gameId: parsed.gameId,
      phaseId: parsed.phaseId,
      title: parsed.title,
      priority: parsed.priority,
      estimate: parsed.estimate,
      position: nextPos,
      createdById: userId,
    })
    .returning();

  await db.insert(activities).values({
    entityType: "task",
    entityId: created.id,
    gameId: parsed.gameId,
    actorId: userId,
    verb: "CREATED",
  });

  revalidatePath(`/games/${gameRow.slug}`);
  return created;
}

export async function setTaskAssignee(taskId: string, userId: string | null) {
  const actorId = await requireUser();
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: { game: true },
  });
  if (!task) throw new Error("Task not found");

  await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
  if (userId) {
    await db
      .insert(taskAssignees)
      .values({ taskId, userId, isPrimary: true });
  }

  await db.insert(activities).values({
    entityType: "task",
    entityId: taskId,
    gameId: task.gameId,
    actorId,
    verb: userId ? "ASSIGNED" : "UNASSIGNED",
    payload: { userId } as Record<string, unknown>,
  });

  revalidatePath(`/games/${task.game.slug}`);
  revalidatePath("/my-work");
  return { ok: true };
}

export async function setTaskTeam(taskId: string, teamId: string | null) {
  await requireUser();
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: { game: true },
  });
  if (!task) throw new Error("Task not found");
  await db
    .update(tasks)
    .set({ teamId, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));
  revalidatePath(`/games/${task.game.slug}`);
  return { ok: true };
}

const SkillLevelEnum = z.enum([
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
]);

const SkillsInput = z.array(
  z.object({ skillId: z.string(), level: SkillLevelEnum }),
);

export async function setTaskSkills(
  taskId: string,
  skillsList: z.input<typeof SkillsInput>,
) {
  await requireUser();
  const parsed = SkillsInput.parse(skillsList);
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: { game: true },
  });
  if (!task) throw new Error("Task not found");

  await db.delete(taskSkills).where(eq(taskSkills.taskId, taskId));
  if (parsed.length) {
    // De-dupe by skillId (composite PK), last level wins.
    const byId = new Map(parsed.map((s) => [s.skillId, s.level]));
    await db.insert(taskSkills).values(
      [...byId.entries()].map(([skillId, level]) => ({
        taskId,
        skillId,
        level,
      })),
    );
  }
  await db.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, taskId));
  revalidatePath(`/games/${task.game.slug}`);
  return { ok: true };
}

export async function deleteTask(taskId: string) {
  await requireUser();
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: { game: true },
  });
  if (!task) return { ok: true };
  await db.delete(tasks).where(eq(tasks.id, taskId));
  revalidatePath(`/games/${task.game.slug}`);
  revalidatePath("/my-work");
  return { ok: true };
}

/* ────────── XP + streak engine ────────── */

async function awardCloseXp(taskId: string, closerId: string) {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: { assignees: true },
  });
  if (!task) return;

  const cfg = await getXpConfig();
  const primary =
    task.assignees.find((a) => a.isPrimary) ?? task.assignees[0];
  const primaryUserId = primary?.userId ?? closerId;

  const base = xpForTaskClose(task.estimate, cfg);
  const mult = multiplierFor(task.dueDate ?? null, new Date(), cfg);
  const amount = applyMultiplier(base, mult);

  await db.insert(xpEvents).values({
    userId: primaryUserId,
    taskId: task.id,
    gameId: task.gameId,
    amount,
    reason:
      mult === cfg.earlyMult
        ? "TASK_CLOSED_EARLY"
        : mult === cfg.lateMult
          ? "TASK_CLOSED_LATE"
          : "TASK_CLOSED",
    multiplier: mult,
    discipline: task.discipline,
  });

  // assist XP to non-primary assignees
  const assists = task.assignees.filter((a) => a.userId !== primaryUserId);
  if (assists.length) {
    const assistAmount = Math.max(
      1,
      Math.round((amount * cfg.assistPct) / 100),
    );
    await db.insert(xpEvents).values(
      assists.map((a) => ({
        userId: a.userId,
        taskId: task.id,
        gameId: task.gameId,
        amount: assistAmount,
        reason: "ASSIST_REVIEW" as const,
        multiplier: cfg.assistPct,
        discipline: task.discipline,
      })),
    );
  }

  const touched = [primaryUserId, ...assists.map((a) => a.userId)];
  await rollupUserXp(touched, cfg);
  await Promise.all(touched.map((u) => bumpStreak(u)));
  await Promise.all(touched.map((u) => checkAndAwardBadges(u)));
}

async function reverseCloseXpIfRecent(taskId: string) {
  const cfg = await getXpConfig();
  const cutoff = new Date(
    Date.now() - cfg.reopenReversalDays * 24 * 60 * 60 * 1000,
  );
  const events = await db.query.xpEvents.findMany({
    where: (e, { eq: eqOp, and: andOp, gt: gtOp }) =>
      andOp(eqOp(e.taskId, taskId), gtOp(e.createdAt, cutoff)),
  });
  if (events.length === 0) return;

  const reversals = events.map((e) => ({
    userId: e.userId,
    taskId: e.taskId,
    gameId: e.gameId,
    amount: -e.amount,
    reason: "REOPENED_REVERSAL" as const,
    multiplier: 0,
    discipline: e.discipline,
  }));
  await db.insert(xpEvents).values(reversals);
  await rollupUserXp(Array.from(new Set(events.map((e) => e.userId))), cfg);
}

async function rollupUserXp(userIds: string[], cfg: XpConfig) {
  for (const uid of userIds) {
    const sums = await db
      .select({ total: sql<number>`coalesce(sum(${xpEvents.amount}), 0)` })
      .from(xpEvents)
      .where(eq(xpEvents.userId, uid));
    const total = Number(sums[0]?.total ?? 0);
    const level = levelFromXp(total, cfg);
    await db
      .update(users)
      .set({ totalXp: total, level })
      .where(eq(users.id, uid));

    // discipline rollup
    const discTotals = await db
      .select({
        discipline: xpEvents.discipline,
        sum: sql<number>`coalesce(sum(${xpEvents.amount}), 0)`,
      })
      .from(xpEvents)
      .where(and(eq(xpEvents.userId, uid), gt(xpEvents.amount, -999999)))
      .groupBy(xpEvents.discipline);

    for (const row of discTotals) {
      if (!row.discipline) continue;
      await db
        .insert(disciplineXp)
        .values({
          userId: uid,
          discipline: row.discipline,
          xp: Number(row.sum),
        })
        .onConflictDoUpdate({
          target: [disciplineXp.userId, disciplineXp.discipline],
          set: { xp: Number(row.sum) },
        });
    }
  }
}

async function bumpStreak(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await db.query.streaks.findFirst({
    where: eq(streaks.userId, userId),
  });

  if (!existing) {
    await db.insert(streaks).values({
      userId,
      current: 1,
      longest: 1,
      lastActivityDate: today,
    });
    return;
  }

  if (existing.lastActivityDate) {
    const last = new Date(existing.lastActivityDate);
    last.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) return;
    const newCurrent = diffDays === 1 ? existing.current + 1 : 1;
    await db
      .update(streaks)
      .set({
        current: newCurrent,
        longest: Math.max(existing.longest, newCurrent),
        lastActivityDate: today,
      })
      .where(eq(streaks.userId, userId));
  } else {
    await db
      .update(streaks)
      .set({ current: 1, longest: Math.max(existing.longest, 1), lastActivityDate: today })
      .where(eq(streaks.userId, userId));
  }
}

type BadgeCriteria = {
  type?: string;
  threshold?: number;
  discipline?: string;
};

async function checkAndAwardBadges(userId: string) {
  const [badgeRows, existing, assignments, streak] = await Promise.all([
    db.query.badges.findMany(),
    db.query.userBadges.findMany({
      where: eq(userBadges.userId, userId),
    }),
    db.query.taskAssignees.findMany({
      where: eq(taskAssignees.userId, userId),
      with: { task: true },
    }),
    db.query.streaks.findFirst({ where: eq(streaks.userId, userId) }),
  ]);

  const have = new Set(existing.map((b) => b.badgeCode));
  const done = assignments
    .map((a) => a.task)
    .filter((t) => t.status === "DONE");
  const closedCount = done.length;
  const onTimeCount = done.filter(
    (t) =>
      t.dueDate &&
      t.completedAt &&
      t.completedAt.getTime() <= t.dueDate.getTime(),
  ).length;
  const disciplineCount = (d: string) =>
    done.filter((t) => t.discipline === d).length;
  const streakLongest = streak?.longest ?? 0;

  const toAward: string[] = [];
  for (const b of badgeRows) {
    if (have.has(b.code)) continue;
    const c = (b.criteria ?? {}) as BadgeCriteria;
    const threshold = c.threshold ?? 1;
    let met = false;
    switch (c.type) {
      case "TASK_CLOSED_COUNT":
        met = closedCount >= threshold;
        break;
      case "ON_TIME_CLOSES":
        met = onTimeCount >= threshold;
        break;
      case "DISCIPLINE_CLOSES":
        met = c.discipline
          ? disciplineCount(c.discipline) >= threshold
          : false;
        break;
      case "STREAK":
        met = streakLongest >= threshold;
        break;
      default:
        met = false;
    }
    if (met) toAward.push(b.code);
  }

  if (toAward.length === 0) return;
  await db
    .insert(userBadges)
    .values(toAward.map((code) => ({ userId, badgeCode: code })))
    .onConflictDoNothing();
  await db.insert(notifications).values(
    toAward.map((code) => ({
      userId,
      type: "BADGE_EARNED" as const,
      payload: { badgeCode: code } as Record<string, unknown>,
    })),
  );
}
