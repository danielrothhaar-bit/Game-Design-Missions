import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "./index";
import {
  badges,
  checklistItems,
  comments,
  dependencies,
  disciplineXp,
  games,
  labels,
  phases,
  streaks,
  taskAssignees,
  taskLabels,
  tasks,
  userBadges,
  users,
  xpEvents,
} from "./schema";
import { STARTER_BADGES } from "../lib/badges";
import { applyMultiplier, levelFromXp, xpForTaskClose } from "../lib/xp";

const STANDARD_PHASES: Array<{
  name: string;
  kind:
    | "CONCEPT"
    | "NARRATIVE"
    | "PUZZLE_DESIGN"
    | "FABRICATION"
    | "TECH"
    | "PLAYTEST"
    | "LAUNCH";
  color: string;
}> = [
  { name: "Concept", kind: "CONCEPT", color: "#94a3b8" },
  { name: "Narrative", kind: "NARRATIVE", color: "#a855f7" },
  { name: "Puzzle Design", kind: "PUZZLE_DESIGN", color: "#3b82f6" },
  { name: "Fabrication", kind: "FABRICATION", color: "#f97316" },
  { name: "Tech", kind: "TECH", color: "#10b981" },
  { name: "Playtest", kind: "PLAYTEST", color: "#eab308" },
  { name: "Launch", kind: "LAUNCH", color: "#ec4899" },
];

const daysFromNow = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

async function reset() {
  console.log("→ wiping existing data");
  await db.execute(sql`
    TRUNCATE TABLE
      "xp_event", "user_badge", "discipline_xp", "streak",
      "dependency", "task_label", "task_assignee", "checklist_item",
      "comment", "mention", "attachment", "activity", "notification",
      "saved_view", "task", "label", "phase", "game",
      "session", "account", "verification_token", "user", "badge"
    RESTART IDENTITY CASCADE
  `);
}

async function seedBadges() {
  console.log("→ seeding badges");
  await db.insert(badges).values(STARTER_BADGES);
}

async function seedUsers() {
  console.log("→ seeding users");
  return db
    .insert(users)
    .values([
      {
        email: "daniel@theescapegame.com",
        name: "Daniel Rothhaar",
        role: "OWNER",
        primaryDiscipline: "PUZZLE",
      },
      {
        email: "morgan@theescapegame.com",
        name: "Morgan Reyes",
        role: "ADMIN",
        primaryDiscipline: "NARRATIVE",
      },
      {
        email: "kai@theescapegame.com",
        name: "Kai Patel",
        role: "DESIGNER",
        primaryDiscipline: "PROP",
      },
      {
        email: "sam@theescapegame.com",
        name: "Sam Lee",
        role: "DESIGNER",
        primaryDiscipline: "ELECTRONICS",
      },
    ])
    .returning();
}

async function seedGame(
  name: string,
  slug: string,
  status:
    | "CONCEPT"
    | "IN_DESIGN"
    | "IN_BUILD"
    | "IN_TESTING"
    | "LAUNCHED"
    | "RETIRED",
  launchInDays: number,
  description: string,
  coverColor: string,
  createdById: string,
) {
  const [game] = await db
    .insert(games)
    .values({
      name,
      slug,
      status,
      description,
      coverColor,
      launchDate: daysFromNow(launchInDays),
      createdById,
    })
    .returning();

  const phaseRows = await db
    .insert(phases)
    .values(
      STANDARD_PHASES.map((p, i) => ({
        gameId: game.id,
        name: p.name,
        kind: p.kind,
        color: p.color,
        order: i,
      })),
    )
    .returning();

  const labelRows = await db
    .insert(labels)
    .values([
      { gameId: game.id, name: "blocker", color: "#ef4444" },
      { gameId: game.id, name: "playtest-bug", color: "#eab308" },
      { gameId: game.id, name: "polish", color: "#06b6d4" },
      { gameId: game.id, name: "research", color: "#a855f7" },
      { gameId: game.id, name: "vendor", color: "#f97316" },
    ])
    .returning();

  return { game, phaseRows, labelRows };
}

type TaskSeed = {
  title: string;
  phaseKind: (typeof STANDARD_PHASES)[number]["kind"];
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "BLOCKED" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  discipline:
    | "NARRATIVE"
    | "PUZZLE"
    | "PROP"
    | "SET"
    | "ELECTRONICS"
    | "SOUND_LIGHTING"
    | "MARKETING"
    | "OPERATIONS"
    | "OTHER";
  estimate: number;
  dueInDays?: number;
  assigneeIdxs: number[];
  labels?: string[];
  blockedReason?: string;
};

const FROST_TASKS: TaskSeed[] = [
  {
    title: "Lock the central narrative arc",
    phaseKind: "NARRATIVE",
    status: "DONE",
    priority: "HIGH",
    discipline: "NARRATIVE",
    estimate: 5,
    dueInDays: -10,
    assigneeIdxs: [1],
  },
  {
    title: "Outline three sub-plots tied to each act",
    phaseKind: "NARRATIVE",
    status: "DONE",
    priority: "MEDIUM",
    discipline: "NARRATIVE",
    estimate: 3,
    dueInDays: -7,
    assigneeIdxs: [1],
  },
  {
    title: "Design the antechamber introduction puzzle",
    phaseKind: "PUZZLE_DESIGN",
    status: "DONE",
    priority: "HIGH",
    discipline: "PUZZLE",
    estimate: 8,
    dueInDays: -3,
    assigneeIdxs: [0],
  },
  {
    title: "Prototype the cryo-lock combination puzzle",
    phaseKind: "PUZZLE_DESIGN",
    status: "IN_REVIEW",
    priority: "HIGH",
    discipline: "PUZZLE",
    estimate: 8,
    dueInDays: 2,
    assigneeIdxs: [0, 3],
  },
  {
    title: "Sketch the explorer journal prop",
    phaseKind: "FABRICATION",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    discipline: "PROP",
    estimate: 3,
    dueInDays: 4,
    assigneeIdxs: [2],
    labels: ["polish"],
  },
  {
    title: "Source weathered brass hardware",
    phaseKind: "FABRICATION",
    status: "BLOCKED",
    priority: "MEDIUM",
    discipline: "PROP",
    estimate: 2,
    dueInDays: 6,
    assigneeIdxs: [2],
    labels: ["vendor"],
    blockedReason: "Awaiting vendor quote on antique brass",
  },
  {
    title: "Wire the aurora lighting cue sheet",
    phaseKind: "TECH",
    status: "TODO",
    priority: "HIGH",
    discipline: "SOUND_LIGHTING",
    estimate: 5,
    dueInDays: 8,
    assigneeIdxs: [3],
  },
  {
    title: "Integrate the prop microcontroller stack",
    phaseKind: "TECH",
    status: "TODO",
    priority: "MEDIUM",
    discipline: "ELECTRONICS",
    estimate: 8,
    dueInDays: 12,
    assigneeIdxs: [3],
  },
  {
    title: "Cast a draft ambient soundscape",
    phaseKind: "TECH",
    status: "TODO",
    priority: "LOW",
    discipline: "SOUND_LIGHTING",
    estimate: 3,
    dueInDays: 14,
    assigneeIdxs: [1],
    labels: ["research"],
  },
  {
    title: "Internal playtest #1 dry run",
    phaseKind: "PLAYTEST",
    status: "TODO",
    priority: "HIGH",
    discipline: "OPERATIONS",
    estimate: 5,
    dueInDays: 20,
    assigneeIdxs: [0, 1, 2, 3],
  },
  {
    title: "Bug: aurora cue mistimed in Act II",
    phaseKind: "PLAYTEST",
    status: "TODO",
    priority: "HIGH",
    discipline: "SOUND_LIGHTING",
    estimate: 2,
    dueInDays: 22,
    assigneeIdxs: [3],
    labels: ["playtest-bug"],
  },
  {
    title: "Bug: journal cover delaminating in humid runs",
    phaseKind: "PLAYTEST",
    status: "TODO",
    priority: "MEDIUM",
    discipline: "PROP",
    estimate: 3,
    dueInDays: 25,
    assigneeIdxs: [2],
    labels: ["playtest-bug"],
  },
  {
    title: "Install checklist v1",
    phaseKind: "LAUNCH",
    status: "TODO",
    priority: "MEDIUM",
    discipline: "OPERATIONS",
    estimate: 5,
    dueInDays: 35,
    assigneeIdxs: [0],
  },
  {
    title: "Train staff on game flow + reset",
    phaseKind: "LAUNCH",
    status: "TODO",
    priority: "HIGH",
    discipline: "OPERATIONS",
    estimate: 8,
    dueInDays: 40,
    assigneeIdxs: [1],
  },
  {
    title: "Marketing photo shoot",
    phaseKind: "LAUNCH",
    status: "TODO",
    priority: "LOW",
    discipline: "MARKETING",
    estimate: 3,
    dueInDays: 45,
    assigneeIdxs: [1],
    labels: ["polish"],
  },
];

const ORACLE_TASKS: TaskSeed[] = [
  {
    title: "High-level concept pitch deck",
    phaseKind: "CONCEPT",
    status: "DONE",
    priority: "HIGH",
    discipline: "NARRATIVE",
    estimate: 5,
    dueInDays: -20,
    assigneeIdxs: [1],
  },
  {
    title: "Mood board for the temple interior",
    phaseKind: "CONCEPT",
    status: "DONE",
    priority: "MEDIUM",
    discipline: "SET",
    estimate: 3,
    dueInDays: -15,
    assigneeIdxs: [2],
  },
  {
    title: "Outline puzzle dependency graph",
    phaseKind: "PUZZLE_DESIGN",
    status: "IN_PROGRESS",
    priority: "HIGH",
    discipline: "PUZZLE",
    estimate: 8,
    dueInDays: 5,
    assigneeIdxs: [0],
  },
  {
    title: "Design the constellation alignment puzzle",
    phaseKind: "PUZZLE_DESIGN",
    status: "TODO",
    priority: "HIGH",
    discipline: "PUZZLE",
    estimate: 8,
    dueInDays: 12,
    assigneeIdxs: [0, 1],
  },
  {
    title: "Draft the priestess monologue",
    phaseKind: "NARRATIVE",
    status: "IN_REVIEW",
    priority: "MEDIUM",
    discipline: "NARRATIVE",
    estimate: 3,
    dueInDays: 3,
    assigneeIdxs: [1],
  },
];

async function seedTasks(
  game: { id: string; name: string },
  phaseRows: { id: string; kind: string }[],
  labelRows: { id: string; name: string }[],
  taskDefs: TaskSeed[],
  userRows: { id: string }[],
) {
  console.log(`→ seeding tasks for ${game.name}`);
  const phaseByKind = Object.fromEntries(
    phaseRows.map((p) => [p.kind, p.id]),
  ) as Record<string, string>;
  const labelByName = Object.fromEntries(
    labelRows.map((l) => [l.name, l.id]),
  );

  const xpEventRows: Array<typeof xpEvents.$inferInsert> = [];

  for (const [i, t] of taskDefs.entries()) {
    const due =
      typeof t.dueInDays === "number" ? daysFromNow(t.dueInDays) : null;
    const completedAt = t.status === "DONE" ? daysFromNow(t.dueInDays ?? 0) : null;
    const closedById =
      t.status === "DONE" ? userRows[t.assigneeIdxs[0]].id : null;

    const [task] = await db
      .insert(tasks)
      .values({
        gameId: game.id,
        phaseId: phaseByKind[t.phaseKind],
        title: t.title,
        status: t.status,
        priority: t.priority,
        discipline: t.discipline,
        estimate: t.estimate,
        estimateLocked: t.status !== "TODO",
        dueDate: due,
        completedAt,
        closedById,
        position: i,
        blockedReason: t.blockedReason,
        createdById: userRows[0].id,
        startedAt:
          t.status === "IN_PROGRESS" || t.status === "IN_REVIEW"
            ? daysFromNow(-1)
            : null,
      })
      .returning();

    if (t.assigneeIdxs.length) {
      await db.insert(taskAssignees).values(
        t.assigneeIdxs.map((idx, k) => ({
          taskId: task.id,
          userId: userRows[idx].id,
          isPrimary: k === 0,
        })),
      );
    }

    if (t.labels?.length) {
      await db.insert(taskLabels).values(
        t.labels.map((name) => ({
          taskId: task.id,
          labelId: labelByName[name],
        })),
      );
    }

    if (t.status === "DONE" && due && completedAt) {
      const base = xpForTaskClose(t.estimate);
      const mult = completedAt < due ? 125 : completedAt > due ? 75 : 100;
      xpEventRows.push({
        userId: userRows[t.assigneeIdxs[0]].id,
        taskId: task.id,
        gameId: game.id,
        amount: applyMultiplier(base, mult),
        reason:
          mult === 125
            ? "TASK_CLOSED_EARLY"
            : mult === 75
              ? "TASK_CLOSED_LATE"
              : "TASK_CLOSED",
        multiplier: mult,
        discipline: t.discipline,
      });
    }
  }

  if (xpEventRows.length) {
    await db.insert(xpEvents).values(xpEventRows);
  }
}

async function rollupXp(userRows: { id: string }[]) {
  console.log("→ rolling up XP totals + levels");
  for (const u of userRows) {
    const events = await db.query.xpEvents.findMany({
      where: (e, { eq: eqOp }) => eqOp(e.userId, u.id),
    });
    const total = events.reduce((acc, e) => acc + e.amount, 0);
    const level = levelFromXp(total);
    await db
      .update(users)
      .set({ totalXp: total, level })
      .where(sql`${users.id} = ${u.id}`);

    const byDisc = events.reduce<Record<string, number>>((acc, e) => {
      if (!e.discipline) return acc;
      acc[e.discipline] = (acc[e.discipline] ?? 0) + e.amount;
      return acc;
    }, {});
    for (const [disc, xp] of Object.entries(byDisc)) {
      await db
        .insert(disciplineXp)
        .values({
          userId: u.id,
          discipline: disc as "NARRATIVE",
          xp,
        })
        .onConflictDoUpdate({
          target: [disciplineXp.userId, disciplineXp.discipline],
          set: { xp },
        });
    }
  }
}

async function seedStreaksAndBadges(userRows: { id: string }[]) {
  console.log("→ seeding streaks + badges");
  await db.insert(streaks).values(
    userRows.map((u, i) => ({
      userId: u.id,
      current: [3, 7, 1, 5][i] ?? 1,
      longest: [9, 14, 4, 12][i] ?? 4,
      lastActivityDate: daysFromNow(0),
    })),
  );

  await db.insert(userBadges).values([
    { userId: userRows[0].id, badgeCode: "first_light" },
    { userId: userRows[1].id, badgeCode: "first_light" },
    { userId: userRows[1].id, badgeCode: "streak_seven" },
    { userId: userRows[1].id, badgeCode: "lore_keeper" },
  ]);
}

async function seedComments(userRows: { id: string }[]) {
  console.log("→ seeding a few comments");
  const someTask = await db.query.tasks.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.status, "IN_REVIEW"),
  });
  if (!someTask) return;
  await db.insert(comments).values([
    {
      taskId: someTask.id,
      authorId: userRows[0].id,
      body: "First pass is in — wired up the failure-state lockout. Ready for review.",
    },
    {
      taskId: someTask.id,
      authorId: userRows[3].id,
      body: "Tested with the prop stack, the relay timing is a hair off. Will tweak.",
    },
  ]);

  const someChecklistTask = await db.query.tasks.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.status, "IN_PROGRESS"),
  });
  if (someChecklistTask) {
    await db.insert(checklistItems).values([
      { taskId: someChecklistTask.id, body: "Draft cover material", done: true, position: 0 },
      { taskId: someChecklistTask.id, body: "Test pages against humidity", done: false, position: 1 },
      { taskId: someChecklistTask.id, body: "Final illustration pass", done: false, position: 2 },
    ]);
  }
}

async function seedDependencies() {
  console.log("→ seeding a dependency");
  const blocked = await db.query.tasks.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.status, "BLOCKED"),
  });
  const blocker = await db.query.tasks.findFirst({
    where: (t, { eq: eqOp }) => eqOp(t.status, "IN_REVIEW"),
  });
  if (blocked && blocker) {
    await db.insert(dependencies).values({
      blockerTaskId: blocker.id,
      blockedTaskId: blocked.id,
      reason: "Need cryo-lock approval before ordering brass",
    });
  }
}

async function main() {
  await reset();
  await seedBadges();
  const userRows = await seedUsers();

  const frost = await seedGame(
    "Frostfall Outpost",
    "frostfall-outpost",
    "IN_TESTING",
    45,
    "An arctic expedition gone wrong. Players race to recover the lost research before the storm closes in.",
    "#3b82f6",
    userRows[0].id,
  );
  await seedTasks(frost.game, frost.phaseRows, frost.labelRows, FROST_TASKS, userRows);

  const oracle = await seedGame(
    "Oracle of Aetheron",
    "oracle-of-aetheron",
    "IN_DESIGN",
    120,
    "Ancient temple ruins guard a prophecy. Players decode constellations to commune with the Oracle.",
    "#a855f7",
    userRows[1].id,
  );
  await seedTasks(oracle.game, oracle.phaseRows, oracle.labelRows, ORACLE_TASKS, userRows);

  await rollupXp(userRows);
  await seedStreaksAndBadges(userRows);
  await seedComments(userRows);
  await seedDependencies();

  console.log("✓ seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
