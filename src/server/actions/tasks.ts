"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  activities,
  disciplineXp,
  streaks,
  taskAssignees,
  tasks,
  users,
  xpEvents,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { applyMultiplier, levelFromXp, multiplierFor, xpForTaskClose } from "@/lib/xp";

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

export async function setTaskSkill(
  taskId: string,
  skillId: string | null,
  skillLevel: z.infer<typeof SkillLevelEnum> | null,
) {
  await requireUser();
  if (skillLevel) SkillLevelEnum.parse(skillLevel);
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: { game: true },
  });
  if (!task) throw new Error("Task not found");
  await db
    .update(tasks)
    .set({
      skillId,
      skillLevel: skillId ? skillLevel : null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));
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

  const primary =
    task.assignees.find((a) => a.isPrimary) ?? task.assignees[0];
  const primaryUserId = primary?.userId ?? closerId;

  const base = xpForTaskClose(task.estimate);
  const mult = multiplierFor(task.dueDate ?? null, new Date());
  const amount = applyMultiplier(base, mult);

  await db.insert(xpEvents).values({
    userId: primaryUserId,
    taskId: task.id,
    gameId: task.gameId,
    amount,
    reason:
      mult === 125
        ? "TASK_CLOSED_EARLY"
        : mult === 75
          ? "TASK_CLOSED_LATE"
          : "TASK_CLOSED",
    multiplier: mult,
    discipline: task.discipline,
  });

  // 25% assist XP to non-primary assignees
  const assists = task.assignees.filter((a) => a.userId !== primaryUserId);
  if (assists.length) {
    const assistAmount = Math.max(1, Math.round((amount * 25) / 100));
    await db.insert(xpEvents).values(
      assists.map((a) => ({
        userId: a.userId,
        taskId: task.id,
        gameId: task.gameId,
        amount: assistAmount,
        reason: "ASSIST_REVIEW" as const,
        multiplier: 25,
        discipline: task.discipline,
      })),
    );
  }

  const touched = [primaryUserId, ...assists.map((a) => a.userId)];
  await rollupUserXp(touched);
  await Promise.all(touched.map((u) => bumpStreak(u)));
}

async function reverseCloseXpIfRecent(taskId: string) {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - sevenDays);
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
  await rollupUserXp(Array.from(new Set(events.map((e) => e.userId))));
}

async function rollupUserXp(userIds: string[]) {
  for (const uid of userIds) {
    const sums = await db
      .select({ total: sql<number>`coalesce(sum(${xpEvents.amount}), 0)` })
      .from(xpEvents)
      .where(eq(xpEvents.userId, uid));
    const total = Number(sums[0]?.total ?? 0);
    const level = levelFromXp(total);
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
