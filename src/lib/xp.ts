/**
 * XP rules. Single source of truth for level math + multipliers.
 * Estimate-scaled (not task-count) to discourage gaming via splitting.
 */

const XP_PER_ESTIMATE_POINT = 10;

export const xpForTaskClose = (estimate: number): number =>
  Math.max(1, estimate) * XP_PER_ESTIMATE_POINT;

export const ON_TIME = 100;
export const EARLY = 125;
export const LATE = 75;
export const ASSIST_PCT = 25;

export function multiplierFor(
  dueDate: Date | null,
  closedAt: Date,
): number {
  if (!dueDate) return ON_TIME;
  const diffMs = closedAt.getTime() - dueDate.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (diffMs < -oneDay) return EARLY;
  if (diffMs > oneDay) return LATE;
  return ON_TIME;
}

export function applyMultiplier(base: number, mult: number): number {
  return Math.round((base * mult) / 100);
}

/**
 * Level curve: tier each level requires (level * 100) XP cumulative-ish.
 * level N requires N * (N - 1) / 2 * 100 + N * 100 total XP.
 * Solving for level given total XP: largest L where L*(L+1)/2 * 100 <= xp.
 */
export function levelFromXp(totalXp: number): number {
  if (totalXp < 100) return 1;
  // L*(L+1)/2 * 100 <= xp  =>  L^2 + L - xp/50 <= 0
  const disc = 1 + (4 * totalXp) / 50;
  const L = Math.floor((-1 + Math.sqrt(disc)) / 2);
  return Math.max(1, L);
}

export function xpForLevel(level: number): number {
  return ((level * (level + 1)) / 2) * 100;
}

export function progressInLevel(totalXp: number): {
  level: number;
  intoLevel: number;
  needed: number;
  pct: number;
} {
  const level = levelFromXp(totalXp);
  const floor = xpForLevel(level - 1);
  const ceil = xpForLevel(level);
  const needed = ceil - floor;
  const intoLevel = totalXp - floor;
  return {
    level,
    intoLevel,
    needed,
    pct: Math.min(100, Math.round((intoLevel / needed) * 100)),
  };
}

export const TITLE_BY_LEVEL: { from: number; title: string }[] = [
  { from: 1, title: "Apprentice" },
  { from: 5, title: "Journeyman" },
  { from: 10, title: "Designer" },
  { from: 18, title: "Senior Designer" },
  { from: 28, title: "Architect" },
  { from: 40, title: "Game Master" },
];

export function titleForLevel(level: number): string {
  let title = TITLE_BY_LEVEL[0].title;
  for (const t of TITLE_BY_LEVEL) if (level >= t.from) title = t.title;
  return title;
}
