/**
 * XP rules. All tunables live in XpConfig so they can be edited in Admin and
 * persisted to the database. The functions accept a config and fall back to
 * DEFAULT_XP_CONFIG, so callers without live config still behave sensibly.
 */

export type LevelTitle = { from: number; title: string };

export type XpConfig = {
  xpPerPoint: number;
  onTimeMult: number;
  earlyMult: number;
  lateMult: number;
  assistPct: number;
  levelBaseXp: number;
  reopenReversalDays: number;
  titles: LevelTitle[];
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
};

export const xpForTaskClose = (
  estimate: number,
  cfg: XpConfig = DEFAULT_XP_CONFIG,
): number => Math.max(1, estimate) * cfg.xpPerPoint;

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
