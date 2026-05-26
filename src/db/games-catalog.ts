/**
 * Real TEG portfolio. Used by `db:add-games` to seed games into any
 * environment (Railway prod, fresh local DB, etc.) without truncating.
 */

export type GameSeed = {
  name: string;
  slug: string;
  coverColor: string;
};

export const TEG_GAMES: GameSeed[] = [
  { name: "Nashville", slug: "nashville", coverColor: "#f97316" },
  { name: "The Heist", slug: "the-heist", coverColor: "#dc2626" },
  { name: "Classified", slug: "classified", coverColor: "#06b6d4" },
  { name: "Prison Break", slug: "prison-break", coverColor: "#ea580c" },
  { name: "Prison Break: Alcatraz", slug: "prison-break-alcatraz", coverColor: "#0ea5e9" },
  { name: "Gold Rush", slug: "gold-rush", coverColor: "#eab308" },
  { name: "Mission: Mars", slug: "mission-mars", coverColor: "#b91c1c" },
  { name: "Playground", slug: "playground", coverColor: "#a855f7" },
  { name: "Special Ops: Mysterious Market", slug: "special-ops-mysterious-market", coverColor: "#10b981" },
  { name: "Ruins: Forbidden Treasure", slug: "ruins-forbidden-treasure", coverColor: "#d97706" },
  { name: "Sabotage", slug: "sabotage", coverColor: "#ef4444" },
  { name: "The Depths", slug: "the-depths", coverColor: "#1d4ed8" },
  { name: "Timeliner", slug: "timeliner", coverColor: "#8b5cf6" },
  { name: "Cosmic Crisis", slug: "cosmic-crisis", coverColor: "#6366f1" },
  { name: "Legend of the Yeti", slug: "legend-of-the-yeti", coverColor: "#3b82f6" },
  { name: "Murder with a Side of Meatballs", slug: "murder-with-a-side-of-meatballs", coverColor: "#e11d48" },
];

export const STANDARD_PHASES: Array<{
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

export const STANDARD_LABELS: Array<{ name: string; color: string }> = [
  { name: "blocker", color: "#ef4444" },
  { name: "playtest-bug", color: "#eab308" },
  { name: "polish", color: "#06b6d4" },
  { name: "research", color: "#a855f7" },
  { name: "vendor", color: "#f97316" },
];
