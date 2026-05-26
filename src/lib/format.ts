export function initials(name: string | null | undefined): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

const STATUS_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  BLOCKED: "Blocked",
  DONE: "Done",
};
export const taskStatusLabel = (s: string) => STATUS_LABEL[s] ?? s;

const STATUS_COLOR: Record<string, string> = {
  TODO: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  IN_PROGRESS: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  IN_REVIEW: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  BLOCKED: "bg-red-500/15 text-red-300 border-red-500/30",
  DONE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};
export const taskStatusColor = (s: string) =>
  STATUS_COLOR[s] ?? STATUS_COLOR.TODO;

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-zinc-400",
  MEDIUM: "text-blue-400",
  HIGH: "text-amber-400",
  URGENT: "text-red-400",
};
export const taskPriorityColor = (p: string) =>
  PRIORITY_COLOR[p] ?? PRIORITY_COLOR.MEDIUM;

const DISCIPLINE_LABEL: Record<string, string> = {
  NARRATIVE: "Narrative",
  PUZZLE: "Puzzle",
  PROP: "Prop",
  SET: "Set",
  ELECTRONICS: "Electronics",
  SOUND_LIGHTING: "Sound + Lighting",
  MARKETING: "Marketing",
  OPERATIONS: "Operations",
  OTHER: "Other",
};
export const disciplineLabel = (d: string | null) =>
  d ? (DISCIPLINE_LABEL[d] ?? d) : "—";

const GAME_STATUS_LABEL: Record<string, string> = {
  CONCEPT: "Concept",
  IN_DESIGN: "In Design",
  IN_BUILD: "In Build",
  IN_TESTING: "In Testing",
  LAUNCHED: "Launched",
  RETIRED: "Retired",
};
export const gameStatusLabel = (s: string) => GAME_STATUS_LABEL[s] ?? s;

const GAME_STATUS_COLOR: Record<string, string> = {
  CONCEPT: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  IN_DESIGN: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  IN_BUILD: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  IN_TESTING: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  LAUNCHED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  RETIRED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};
export const gameStatusColor = (s: string) =>
  GAME_STATUS_COLOR[s] ?? GAME_STATUS_COLOR.CONCEPT;

export const GAME_STATUSES = [
  "CONCEPT",
  "IN_DESIGN",
  "IN_BUILD",
  "IN_TESTING",
  "LAUNCHED",
  "RETIRED",
] as const;
