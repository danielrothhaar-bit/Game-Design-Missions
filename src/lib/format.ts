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

// Light mode: solid tinted backgrounds with dark text so pills read clearly
// on parchment. Dark mode: keep the translucent glow that worked on slate.
const STATUS_COLOR: Record<string, string> = {
  TODO:
    "bg-stone-200 text-stone-800 border-stone-500 dark:bg-zinc-500/15 dark:text-zinc-300 dark:border-zinc-500/30",
  IN_PROGRESS:
    "bg-blue-100 text-blue-900 border-blue-600 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  IN_REVIEW:
    "bg-amber-100 text-amber-900 border-amber-700 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  BLOCKED:
    "bg-red-100 text-red-900 border-red-700 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  DONE:
    "bg-emerald-100 text-emerald-900 border-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
};
export const taskStatusColor = (s: string) =>
  STATUS_COLOR[s] ?? STATUS_COLOR.TODO;

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-stone-600 dark:text-zinc-400",
  MEDIUM: "text-blue-800 dark:text-blue-400",
  HIGH: "text-amber-800 dark:text-amber-400",
  URGENT: "text-red-800 dark:text-red-400",
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
  NEW: "New",
  PROTOTYPE: "Prototype",
  CLIENT: "Client",
  OPEN: "Open",
  LEGACY: "Legacy",
  ACQUISITION: "Acquisition",
};
export const gameStatusLabel = (s: string) => GAME_STATUS_LABEL[s] ?? s;

const GAME_STATUS_COLOR: Record<string, string> = {
  NEW:
    "bg-blue-100 text-blue-900 border-blue-600 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  PROTOTYPE:
    "bg-cyan-100 text-cyan-900 border-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
  CLIENT:
    "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:border-fuchsia-500/30",
  OPEN:
    "bg-emerald-100 text-emerald-900 border-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  LEGACY:
    "bg-stone-200 text-stone-700 border-stone-500 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/30",
  ACQUISITION:
    "bg-amber-100 text-amber-900 border-amber-700 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
};
export const gameStatusColor = (s: string) =>
  GAME_STATUS_COLOR[s] ?? GAME_STATUS_COLOR.NEW;

export const GAME_STATUSES = [
  "NEW",
  "PROTOTYPE",
  "CLIENT",
  "OPEN",
  "LEGACY",
  "ACQUISITION",
] as const;

// Top-level business divisions. Each project belongs to one.
export const DIVISIONS: { slug: string; label: string }[] = [
  { slug: "TEG_GAMES", label: "TEG Games" },
  { slug: "GBGS", label: "GBGS" },
  { slug: "ADVENTURE_MINING", label: "Adventure Mining" },
];

export const divisionLabel = (slug: string) =>
  DIVISIONS.find((d) => d.slug === slug)?.label ?? slug;

// Fixed status set for sidequests (not editable, unlike game statuses).
export const SIDEQUEST_STATUSES: { slug: string; label: string; color: string }[] =
  [
    { slug: "OPEN", label: "Open", color: "#10b981" },
    { slug: "ON_HOLD", label: "On Hold", color: "#f59e0b" },
    { slug: "CLOSED", label: "Closed", color: "#71717a" },
  ];
