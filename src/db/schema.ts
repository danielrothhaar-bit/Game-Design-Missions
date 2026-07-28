import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

/* ─────────────────────── enums ─────────────────────── */

export const userRole = pgEnum("user_role", [
  "OWNER",
  "ADMIN",
  "DESIGNER",
  "VIEWER",
]);

export const gameStatus = pgEnum("game_status", [
  "NEW",
  "OPEN",
  "LEGACY",
  "ACQUISITION",
  "CLIENT",
  "PROTOTYPE",
]);

export const phaseKind = pgEnum("phase_kind", [
  "CONCEPT",
  "NARRATIVE",
  "PUZZLE_DESIGN",
  "FABRICATION",
  "TECH",
  "PLAYTEST",
  "LAUNCH",
  "CUSTOM",
]);

export const taskStatus = pgEnum("task_status", [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE",
]);

export const taskPriority = pgEnum("task_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const discipline = pgEnum("discipline", [
  "NARRATIVE",
  "PUZZLE",
  "PROP",
  "SET",
  "ELECTRONICS",
  "SOUND_LIGHTING",
  "MARKETING",
  "OPERATIONS",
  "OTHER",
]);

export const experienceLevel = pgEnum("experience_level", [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
]);

export const xpReason = pgEnum("xp_reason", [
  "TASK_CLOSED",
  "TASK_CLOSED_EARLY",
  "TASK_CLOSED_LATE",
  "ASSIST_REVIEW",
  "REOPENED_REVERSAL",
  "BADGE_EARNED",
  "QUEST_COMPLETED",
  "STREAK_BONUS",
  "MANUAL_ADJUSTMENT",
]);

export const notificationType = pgEnum("notification_type", [
  "ASSIGNED",
  "MENTIONED",
  "DUE_SOON",
  "OVERDUE",
  "COMMENT",
  "STATUS_CHANGED",
  "BADGE_EARNED",
  "LEVEL_UP",
]);

export const activityVerb = pgEnum("activity_verb", [
  "CREATED",
  "UPDATED",
  "DELETED",
  "STATUS_CHANGED",
  "ASSIGNED",
  "UNASSIGNED",
  "COMMENTED",
  "CLOSED",
  "REOPENED",
]);

/* ──────────────────── Auth.js tables ─────────────────── */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text(),
  email: text().notNull().unique(),
  emailVerified: timestamp({ mode: "date", withTimezone: true }),
  image: text(),
  passwordHash: text(),
  role: userRole().notNull().default("DESIGNER"),
  primaryDiscipline: discipline().default("OTHER"),
  totalXp: integer().notNull().default(0),
  level: integer().notNull().default(1),
  createdAt: timestamp({ mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().$type<AdapterAccountType>().notNull(),
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text(),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp({ mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text().notNull(),
    token: text().notNull(),
    expires: timestamp({ mode: "date", withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ───────────────────── reference tables ────────────────────── */

export const teams = pgTable(
  "team",
  {
    id: text()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar({ length: 80 }).notNull(),
    slug: varchar({ length: 90 }).notNull(),
    color: varchar({ length: 16 }).notNull().default("#3b82f6"),
    order: integer().notNull().default(0),
  },
  (t) => [uniqueIndex("team_slug_idx").on(t.slug)],
);

export const skills = pgTable(
  "skill",
  {
    id: text()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar({ length: 80 }).notNull(),
    slug: varchar({ length: 90 }).notNull(),
    color: varchar({ length: 16 }).notNull().default("#a855f7"),
    order: integer().notNull().default(0),
    archived: boolean().notNull().default(false),
    // Completed tasks at a difficulty before a member is flagged as ready to
    // be promoted to that level for this skill.
    promotionThreshold: integer().notNull().default(10),
  },
  (t) => [uniqueIndex("skill_slug_idx").on(t.slug)],
);

// Editable game categories (was a hard-coded enum). `slug` is the value
// stored on game.statusSlug.
export const gameStatusOptions = pgTable("game_status_option", {
  slug: varchar({ length: 40 }).primaryKey(),
  label: varchar({ length: 60 }).notNull(),
  color: varchar({ length: 16 }).notNull().default("#3b82f6"),
  order: integer().notNull().default(0),
});

// Editable business divisions. `slug` is stored on game.division.
export const divisions = pgTable("division", {
  slug: varchar({ length: 32 }).primaryKey(),
  label: varchar({ length: 60 }).notNull(),
  color: varchar({ length: 16 }).notNull().default("#7c3aed"),
  order: integer().notNull().default(0),
});

// Per-user division visibility (denylist: a row with hidden=true means the
// user does not see that division in their sidebar).
export const userDivisions = pgTable(
  "user_division",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    divisionSlug: varchar({ length: 32 }).notNull(),
    hidden: boolean().notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.userId, t.divisionSlug] })],
);

/* ─────────────── phase task templates ─────────────── */

export const phaseTemplates = pgTable("phase_template", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar({ length: 120 }).notNull(),
  kind: phaseKind().notNull().default("CUSTOM"),
  color: varchar({ length: 16 }).notNull().default("#64748b"),
  order: integer().notNull().default(0),
});

export const phaseTemplateTasks = pgTable("phase_template_task", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  phaseTemplateId: text()
    .notNull()
    .references(() => phaseTemplates.id, { onDelete: "cascade" }),
  title: varchar({ length: 280 }).notNull(),
  teamId: text().references(() => teams.id, { onDelete: "set null" }),
  // Standard task fields that get copied onto tasks created from this
  // template (alongside the skills join below).
  priority: taskPriority().notNull().default("MEDIUM"),
  scopeSize: text().notNull().default("M"),
  order: integer().notNull().default(0),
});

// Skills (with difficulty) attached to a template task — copied onto the
// real task's task_skill rows when the template is applied.
export const phaseTemplateTaskSkills = pgTable(
  "phase_template_task_skill",
  {
    templateTaskId: text()
      .notNull()
      .references(() => phaseTemplateTasks.id, { onDelete: "cascade" }),
    skillId: text()
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    level: experienceLevel().notNull().default("INTERMEDIATE"),
  },
  (t) => [primaryKey({ columns: [t.templateTaskId, t.skillId] })],
);

/* ───────────────────── domain tables ────────────────────── */

export const games = pgTable(
  "game",
  {
    id: text()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar({ length: 120 }).notNull(),
    slug: varchar({ length: 140 }).notNull(),
    description: text(),
    // "GAME" (a project) or "SIDEQUEST" (lighter-weight quest).
    kind: varchar({ length: 16 }).notNull().default("GAME"),
    // Business division a project belongs to (see DIVISIONS).
    division: varchar({ length: 32 }).notNull().default("TEG_GAMES"),
    status: gameStatus().notNull().default("NEW"),
    statusSlug: varchar({ length: 40 }),
    coverColor: varchar({ length: 16 }).notNull().default("#7c3aed"),
    coverImage: text(),
    launchDate: timestamp({ mode: "date", withTimezone: true }),
    leadUserId: text().references(() => users.id, { onDelete: "set null" }),
    createdById: text().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp({ mode: "date", withTimezone: true }),
  },
  (t) => [uniqueIndex("game_slug_idx").on(t.slug)],
);

export const phases = pgTable("phase", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  gameId: text()
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  name: varchar({ length: 80 }).notNull(),
  kind: phaseKind().notNull().default("CUSTOM"),
  order: integer().notNull().default(0),
  color: varchar({ length: 16 }).notNull().default("#64748b"),
});

export const labels = pgTable("label", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  gameId: text()
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  name: varchar({ length: 40 }).notNull(),
  color: varchar({ length: 16 }).notNull().default("#64748b"),
});

export const tasks = pgTable("task", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  gameId: text()
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  phaseId: text().references(() => phases.id, { onDelete: "set null" }),
  parentTaskId: text("parent_task_id"),
  title: varchar({ length: 280 }).notNull(),
  description: text(),
  status: taskStatus().notNull().default("TODO"),
  priority: taskPriority().notNull().default("MEDIUM"),
  discipline: discipline(),
  teamId: text().references(() => teams.id, { onDelete: "set null" }),
  estimate: integer().notNull().default(1),
  estimateLocked: boolean().notNull().default(false),
  // Coarse effort/size bucket (S|M|L|XL) used to weight XP. Replaces the
  // manual estimate as the size signal; auto-defaulted from difficulty and
  // locked once work starts (see estimateLocked).
  scopeSize: text().notNull().default("M"),
  dueDate: timestamp({ mode: "date", withTimezone: true }),
  startedAt: timestamp({ mode: "date", withTimezone: true }),
  completedAt: timestamp({ mode: "date", withTimezone: true }),
  position: integer().notNull().default(0),
  blockedReason: text(),
  createdById: text().references(() => users.id, { onDelete: "set null" }),
  closedById: text().references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp({ mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp({ mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const taskAssignees = pgTable(
  "task_assignee",
  {
    taskId: text()
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isPrimary: boolean().notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.userId] })],
);

export const taskLabels = pgTable(
  "task_label",
  {
    taskId: text()
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    labelId: text()
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.labelId] })],
);

export const taskSkills = pgTable(
  "task_skill",
  {
    taskId: text()
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    skillId: text()
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    level: experienceLevel().notNull().default("INTERMEDIATE"),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.skillId] })],
);

export const dependencies = pgTable(
  "dependency",
  {
    blockerTaskId: text()
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    blockedTaskId: text()
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    reason: text(),
  },
  (t) => [primaryKey({ columns: [t.blockerTaskId, t.blockedTaskId] })],
);

export const checklistItems = pgTable("checklist_item", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  taskId: text()
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  body: varchar({ length: 280 }).notNull(),
  done: boolean().notNull().default(false),
  position: integer().notNull().default(0),
});

export const comments = pgTable("comment", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  taskId: text()
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  authorId: text().references(() => users.id, { onDelete: "set null" }),
  body: text().notNull(),
  createdAt: timestamp({ mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  editedAt: timestamp({ mode: "date", withTimezone: true }),
});

export const mentions = pgTable(
  "mention",
  {
    commentId: text()
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.userId] })],
);

export const attachments = pgTable("attachment", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  taskId: text()
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  uploadedById: text().references(() => users.id, { onDelete: "set null" }),
  url: text().notNull(),
  name: varchar({ length: 200 }).notNull(),
  mimeType: varchar({ length: 80 }),
  byteSize: integer(),
  createdAt: timestamp({ mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const activities = pgTable("activity", {
  id: serial().primaryKey(),
  entityType: varchar({ length: 40 }).notNull(),
  entityId: text().notNull(),
  gameId: text().references(() => games.id, { onDelete: "cascade" }),
  actorId: text().references(() => users.id, { onDelete: "set null" }),
  verb: activityVerb().notNull(),
  payload: jsonb().$type<Record<string, unknown>>(),
  createdAt: timestamp({ mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notifications = pgTable("notification", {
  id: serial().primaryKey(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationType().notNull(),
  taskId: text().references(() => tasks.id, { onDelete: "cascade" }),
  gameId: text().references(() => games.id, { onDelete: "cascade" }),
  actorId: text().references(() => users.id, { onDelete: "set null" }),
  payload: jsonb().$type<Record<string, unknown>>(),
  readAt: timestamp({ mode: "date", withTimezone: true }),
  createdAt: timestamp({ mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const savedViews = pgTable("saved_view", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  gameId: text().references(() => games.id, { onDelete: "cascade" }),
  userId: text().references(() => users.id, { onDelete: "cascade" }),
  name: varchar({ length: 80 }).notNull(),
  viewType: varchar({ length: 24 }).notNull(),
  config: jsonb().$type<Record<string, unknown>>(),
  isShared: boolean().notNull().default(false),
});

/* ───────────────── gamification tables ────────────────── */

export const xpEvents = pgTable("xp_event", {
  id: serial().primaryKey(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  taskId: text().references(() => tasks.id, { onDelete: "set null" }),
  gameId: text().references(() => games.id, { onDelete: "set null" }),
  amount: integer().notNull(),
  reason: xpReason().notNull(),
  multiplier: integer().notNull().default(100),
  discipline: discipline(),
  note: text(),
  createdAt: timestamp({ mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const badges = pgTable("badge", {
  code: varchar({ length: 60 }).primaryKey(),
  name: varchar({ length: 80 }).notNull(),
  description: text().notNull(),
  icon: varchar({ length: 40 }).notNull(),
  color: varchar({ length: 16 }).notNull().default("#7c3aed"),
  imageUrl: text(),
  criteria: jsonb().$type<Record<string, unknown>>().notNull(),
});

export const userBadges = pgTable(
  "user_badge",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeCode: varchar({ length: 60 })
      .notNull()
      .references(() => badges.code, { onDelete: "cascade" }),
    awardedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeCode] })],
);

/**
 * Per-user skill proficiency for the RPG-style character sheet.
 * level is 0–4: 0 None, 1 Beginner, 2 Intermediate, 3 Advanced, 4 Expert.
 */
export const userSkills = pgTable(
  "user_skill",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: text()
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    level: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skillId] })],
);

export const disciplineXp = pgTable(
  "discipline_xp",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    discipline: discipline().notNull(),
    xp: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.discipline] })],
);

/**
 * "Do today" plan: a per-user, per-task flag stamped with the date it was
 * set. The Today view only shows rows whose planDate is the current day, so
 * the plan naturally resets each day with no cron.
 */
export const dailyPlans = pgTable(
  "daily_plan",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: text()
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    planDate: date({ mode: "string" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.taskId] })],
);

export const streaks = pgTable("streak", {
  userId: text()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  current: integer().notNull().default(0),
  longest: integer().notNull().default(0),
  lastActivityDate: timestamp({ mode: "date", withTimezone: true }),
});

/* ───────────────── pre-deploy data backups ────────────────── */

export const backups = pgTable("backup", {
  id: serial().primaryKey(),
  createdAt: timestamp({ mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  reason: varchar({ length: 80 }).notNull().default("pre-deploy"),
  payload: jsonb().$type<Record<string, unknown>>().notNull(),
});

/* ───────────────── app configuration (singleton) ────────────────── */

export const appConfig = pgTable("app_config", {
  id: varchar({ length: 20 }).primaryKey().default("global"),
  xpPerPoint: integer().notNull().default(10),
  onTimeMult: integer().notNull().default(100),
  earlyMult: integer().notNull().default(125),
  lateMult: integer().notNull().default(75),
  assistPct: integer().notNull().default(25),
  levelBaseXp: integer().notNull().default(100),
  reopenReversalDays: integer().notNull().default(7),
  titles: jsonb()
    .$type<{ from: number; title: string }[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  // Auto due-date defaults: lead time (in days) per priority for newly
  // created tasks. autoDueDates toggles the whole feature.
  autoDueDates: boolean().notNull().default(true),
  dueLeadUrgent: integer().notNull().default(2),
  dueLeadHigh: integer().notNull().default(7),
  dueLeadMedium: integer().notNull().default(14),
  dueLeadLow: integer().notNull().default(30),
  // ── XP weight tables ──────────────────────────────────────────
  // Base difficulty weight per skill level (summed across a task's skills).
  diffWeightBeginner: integer().notNull().default(1),
  diffWeightIntermediate: integer().notNull().default(2),
  diffWeightAdvanced: integer().notNull().default(4),
  diffWeightExpert: integer().notNull().default(7),
  // Scope (effort) size multipliers, as percentages.
  scopeMultS: integer().notNull().default(100),
  scopeMultM: integer().notNull().default(200),
  scopeMultL: integer().notNull().default(300),
  scopeMultXl: integer().notNull().default(500),
  // Priority impact multipliers, as percentages.
  priorityMultLow: integer().notNull().default(90),
  priorityMultMedium: integer().notNull().default(100),
  priorityMultHigh: integer().notNull().default(115),
  priorityMultUrgent: integer().notNull().default(130),
  // Set once the deploy step has derived cover colors from existing logos,
  // so the backfill never re-runs (and never clobbers manual color edits).
  logoColorsBackfilledAt: timestamp({ mode: "date", withTimezone: true }),
});

/* ────────────────────── relations ─────────────────────── */

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  taskAssignments: many(taskAssignees),
  comments: many(comments),
  xpEvents: many(xpEvents),
  badges: many(userBadges),
  disciplineXp: many(disciplineXp),
  streak: one(streaks, { fields: [users.id], references: [streaks.userId] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const gamesRelations = relations(games, ({ many, one }) => ({
  phases: many(phases),
  tasks: many(tasks),
  labels: many(labels),
  createdBy: one(users, {
    fields: [games.createdById],
    references: [users.id],
  }),
}));

export const phasesRelations = relations(phases, ({ one, many }) => ({
  game: one(games, { fields: [phases.gameId], references: [games.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  game: one(games, { fields: [tasks.gameId], references: [games.id] }),
  phase: one(phases, { fields: [tasks.phaseId], references: [phases.id] }),
  team: one(teams, { fields: [tasks.teamId], references: [teams.id] }),
  skills: many(taskSkills),
  createdBy: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
    relationName: "createdBy",
  }),
  closedBy: one(users, {
    fields: [tasks.closedById],
    references: [users.id],
    relationName: "closedBy",
  }),
  assignees: many(taskAssignees),
  labels: many(taskLabels),
  comments: many(comments),
  checklistItems: many(checklistItems),
  attachments: many(attachments),
}));

export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
  task: one(tasks, { fields: [taskAssignees.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskAssignees.userId], references: [users.id] }),
}));

export const taskLabelsRelations = relations(taskLabels, ({ one }) => ({
  task: one(tasks, { fields: [taskLabels.taskId], references: [tasks.id] }),
  label: one(labels, {
    fields: [taskLabels.labelId],
    references: [labels.id],
  }),
}));

export const taskSkillsRelations = relations(taskSkills, ({ one }) => ({
  task: one(tasks, { fields: [taskSkills.taskId], references: [tasks.id] }),
  skill: one(skills, {
    fields: [taskSkills.skillId],
    references: [skills.id],
  }),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
  game: one(games, { fields: [labels.gameId], references: [games.id] }),
  tasks: many(taskLabels),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  task: one(tasks, { fields: [comments.taskId], references: [tasks.id] }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  mentions: many(mentions),
}));

export const phaseTemplatesRelations = relations(
  phaseTemplates,
  ({ many }) => ({
    tasks: many(phaseTemplateTasks),
  }),
);

export const phaseTemplateTasksRelations = relations(
  phaseTemplateTasks,
  ({ one, many }) => ({
    template: one(phaseTemplates, {
      fields: [phaseTemplateTasks.phaseTemplateId],
      references: [phaseTemplates.id],
    }),
    team: one(teams, {
      fields: [phaseTemplateTasks.teamId],
      references: [teams.id],
    }),
    skills: many(phaseTemplateTaskSkills),
  }),
);

export const phaseTemplateTaskSkillsRelations = relations(
  phaseTemplateTaskSkills,
  ({ one }) => ({
    templateTask: one(phaseTemplateTasks, {
      fields: [phaseTemplateTaskSkills.templateTaskId],
      references: [phaseTemplateTasks.id],
    }),
    skill: one(skills, {
      fields: [phaseTemplateTaskSkills.skillId],
      references: [skills.id],
    }),
  }),
);

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, { fields: [userBadges.userId], references: [users.id] }),
  badge: one(badges, {
    fields: [userBadges.badgeCode],
    references: [badges.code],
  }),
}));

/* ─────────────── inferred row types ────────────── */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type Phase = typeof phases.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Label = typeof labels.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type XpEvent = typeof xpEvents.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type AppConfig = typeof appConfig.$inferSelect;
export type GameStatusOption = typeof gameStatusOptions.$inferSelect;
export type UserSkill = typeof userSkills.$inferSelect;
export type Division = typeof divisions.$inferSelect;
