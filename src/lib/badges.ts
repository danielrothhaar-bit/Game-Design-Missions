/**
 * Starter badges (Phase 1 scope: first 5).
 * Criteria is evaluated server-side after every XP event.
 */

export type BadgeDef = {
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria: Record<string, unknown>;
};

export const STARTER_BADGES: BadgeDef[] = [
  {
    code: "first_light",
    name: "First Light",
    description: "Closed your first task.",
    icon: "Sparkles",
    color: "#f59e0b",
    criteria: { type: "TASK_CLOSED_COUNT", threshold: 1 },
  },
  {
    code: "bug_squasher",
    name: "Bug Squasher",
    description: "Closed 25 playtest bugs.",
    icon: "Bug",
    color: "#10b981",
    criteria: { type: "PLAYTEST_BUGS_CLOSED", threshold: 25 },
  },
  {
    code: "on_the_dot",
    name: "On the Dot",
    description: "Closed 10 tasks on or before their due date.",
    icon: "Target",
    color: "#3b82f6",
    criteria: { type: "ON_TIME_CLOSES", threshold: 10 },
  },
  {
    code: "lore_keeper",
    name: "Lore Keeper",
    description: "Closed 10 narrative tasks.",
    icon: "BookOpen",
    color: "#a855f7",
    criteria: { type: "DISCIPLINE_CLOSES", discipline: "NARRATIVE", threshold: 10 },
  },
  {
    code: "streak_seven",
    name: "Hot Streak",
    description: "Contributed 7 days in a row.",
    icon: "Flame",
    color: "#ef4444",
    criteria: { type: "STREAK", threshold: 7 },
  },
];
