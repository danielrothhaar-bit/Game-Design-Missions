/**
 * XP rules. All tunables live in XpConfig so they can be edited in Admin and
 * persisted to the database. The functions accept a config and fall back to
 * DEFAULT_XP_CONFIG, so callers without live config still behave sensibly.
 */

export type LevelTitle = { from: number; title: string };

export const SCOPE_SIZES = ["S", "M", "L", "XL"] as const;
export type ScopeSize = (typeof SCOPE_SIZES)[number];
export const SCOPE_LABEL: Record<ScopeSize, string> = {
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "Massive",
};

export type DifficultyWeights = {
  BEGINNER: number;
  INTERMEDIATE: number;
  ADVANCED: number;
  EXPERT: number;
};
export type ScopeMultipliers = Record<ScopeSize, number>;
export type PriorityMultipliers = {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  URGENT: number;
};

export type XpConfig = {
  xpPerPoint: number;
  onTimeMult: number;
  earlyMult: number;
  lateMult: number;
  assistPct: number;
  levelBaseXp: number;
  reopenReversalDays: number;
  titles: LevelTitle[];
  // Weight tables that derive a task's XP from how it was scoped, replacing
  // the old manual estimate. base = Σ difficulty weights across skills (≥1),
  // then × scope% × priority%, then × xpPerPoint and the timing multiplier.
  difficultyWeight: DifficultyWeights;
  scopeMult: ScopeMultipliers;
  priorityMult: PriorityMultipliers;
};

export const DEFAULT_TITLES: LevelTitle[] = [
  { from: 1, title: "Apprentice" },
  { from: 5, title: "Journeyman" },
  { from: 10, title: "Designer" },
  { from: 18, title: "Senior Designer" },
  { from: 28, title: "Architect" },
  { from: 40, title: "Game Master" },
];

export const DEFAULT_XP_CONFIG: XpConfig = {
  xpPerPoint: 10,
  onTimeMult: 100,
  earlyMult: 125,
  lateMult: 75,
  assistPct: 25,
  levelBaseXp: 100,
  reopenReversalDays: 7,
  titles: DEFAULT_TITLES,
  difficultyWeight: { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 4, EXPERT: 7 },
  scopeMult: { S: 100, M: 200, L: 300, XL: 500 },
  priorityMult: { LOW: 90, MEDIUM: 100, HIGH: 115, URGENT: 130 },
};

/** Describes how a task was scoped — the inputs that determine its XP. */
export type TaskScoring = {
  skillLevels: string[];
  scopeSize: string;
  priority: string;
};

/** Σ of per-difficulty weights across a task's skills, floored at 1. */
export function taskBaseWeight(
  skillLevels: string[],
  cfg: XpConfig = DEFAULT_XP_CONFIG,
): number {
  const sum = skillLevels.reduce(
    (s, lvl) =>
      s + (cfg.difficultyWeight[lvl as keyof DifficultyWeights] ?? 0),
    0,
  );
  return Math.max(1, sum);
}

/** Effort/size weight (base × scope%) — used for both XP and team workload. */
export function taskEffortWeight(
  skillLevels: string[],
  scopeSize: string,
  cfg: XpConfig = DEFAULT_XP_CONFIG,
): number {
  const scope = cfg.scopeMult[scopeSize as ScopeSize] ?? cfg.scopeMult.M;
  return taskBaseWeight(skillLevels, cfg) * (scope / 100);
}

/**
 * Base XP a task is worth before the timing multiplier:
 * round(base × scope% × priority% × xpPerPoint), floored at 1.
 */
export function xpForTaskClose(
  scoring: TaskScoring,
  cfg: XpConfig = DEFAULT_XP_CONFIG,
): number {
  const effort = taskEffortWeight(scoring.skillLevels, scoring.scopeSize, cfg);
  const impact =
    (cfg.priorityMult[scoring.priority as keyof PriorityMultipliers] ??
      cfg.priorityMult.MEDIUM) / 100;
  return Math.max(1, Math.round(effort * impact * cfg.xpPerPoint));
}

export function multiplierFor(
  dueDate: Date | null,
  closedAt: Date,
  cfg: XpConfig = DEFAULT_XP_CONFIG,
): number {
  if (!dueDate) return cfg.onTimeMult;
  const diffMs = closedAt.getTime() - dueDate.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (diffMs < -oneDay) return cfg.earlyMult;
  if (diffMs > oneDay) return cfg.lateMult;
  return cfg.onTimeMult;
}

export function applyMultiplier(base: number, mult: number): number {
  return Math.round((base * mult) / 100);
}

/**
 * Level N requires sum_{k=1..N} (k * base) = base * N(N+1)/2 total XP.
 * Inverse: largest L where base * L(L+1)/2 <= xp.
 */
export function levelFromXp(
  totalXp: number,
  cfg: XpConfig = DEFAULT_XP_CONFIG,
): number {
  const base = cfg.levelBaseXp || 100;
  if (totalXp < base) return 1;
  const disc = 1 + (8 * totalXp) / base;
  const L = Math.floor((-1 + Math.sqrt(disc)) / 2);
  return Math.max(1, L);
}

export function xpForLevel(
  level: number,
  cfg: XpConfig = DEFAULT_XP_CONFIG,
): number {
  const base = cfg.levelBaseXp || 100;
  return ((level * (level + 1)) / 2) * base;
}

export function progressInLevel(
  totalXp: number,
  cfg: XpConfig = DEFAULT_XP_CONFIG,
): { level: number; intoLevel: number; needed: number; pct: number } {
  const level = levelFromXp(totalXp, cfg);
  const floor = xpForLevel(level - 1, cfg);
  const ceil = xpForLevel(level, cfg);
  const needed = ceil - floor;
  const intoLevel = totalXp - floor;
  return {
    level,
    intoLevel,
    needed,
    pct: needed > 0 ? Math.min(100, Math.round((intoLevel / needed) * 100)) : 0,
  };
}

// Kept for backwards-compat with code that imported the constant array.
export const TITLE_BY_LEVEL = DEFAULT_TITLES;

export function titleForLevel(
  level: number,
  titles: LevelTitle[] = DEFAULT_TITLES,
): string {
  const sorted = [...titles].sort((a, b) => a.from - b.from);
  let title = sorted[0]?.title ?? "Apprentice";
  for (const t of sorted) if (level >= t.from) title = t.title;
  return title;
}
