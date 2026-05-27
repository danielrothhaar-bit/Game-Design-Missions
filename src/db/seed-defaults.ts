import { eq, isNull, sql } from "drizzle-orm";
import { db } from "./index";
import {
  badges,
  divisions,
  gameStatusOptions,
  games,
  skills,
  teams,
} from "./schema";
import { STARTER_BADGES } from "../lib/badges";

export const DEFAULT_DIVISIONS: Array<{
  slug: string;
  label: string;
  color: string;
}> = [
  { slug: "TEG_GAMES", label: "TEG Games", color: "#7c3aed" },
  { slug: "GBGS", label: "GBGS", color: "#0ea5e9" },
  { slug: "ADVENTURE_MINING", label: "Adventure Mining", color: "#f59e0b" },
];

export const DEFAULT_GAME_STATUSES: Array<{
  slug: string;
  label: string;
  color: string;
}> = [
  { slug: "NEW", label: "New", color: "#3b82f6" },
  { slug: "PROTOTYPE", label: "Prototype", color: "#06b6d4" },
  { slug: "CLIENT", label: "Client", color: "#d946ef" },
  { slug: "OPEN", label: "Open", color: "#10b981" },
  { slug: "LEGACY", label: "Legacy", color: "#71717a" },
  { slug: "ACQUISITION", label: "Acquisition", color: "#f59e0b" },
];

export const DEFAULT_TEAMS: Array<{ name: string; slug: string; color: string }> =
  [
    { name: "Product Design", slug: "product-design", color: "#3b82f6" },
    { name: "Engineering", slug: "engineering", color: "#0d9488" },
    { name: "Tech Controls", slug: "tech-controls", color: "#eab308" },
    { name: "PM", slug: "pm", color: "#92765c" },
    { name: "Brand", slug: "brand", color: "#be123c" },
    { name: "Videography", slug: "videography", color: "#f43f5e" },
    { name: "Paint", slug: "paint", color: "#8b5cf6" },
    { name: "Architecture", slug: "architecture", color: "#93a3b8" },
    {
      name: "Creative Engineering Leadership",
      slug: "creative-engineering-leadership",
      color: "#22c55e",
    },
    { name: "Fabrication", slug: "fabrication", color: "#8d6e63" },
  ];

export const DEFAULT_SKILLS: Array<{ name: string; slug: string; color: string }> =
  [
    { name: "Puzzle Design", slug: "puzzle-design", color: "#3b82f6" },
    { name: "Narrative Writing", slug: "narrative-writing", color: "#a855f7" },
    { name: "Documentation", slug: "documentation", color: "#06b6d4" },
    { name: "3D Printing", slug: "3d-printing", color: "#f97316" },
    { name: "CAD", slug: "cad", color: "#14b8a6" },
    { name: "Electronics & Wiring", slug: "electronics-wiring", color: "#eab308" },
    { name: "Programming", slug: "programming", color: "#10b981" },
    { name: "Carpentry", slug: "carpentry", color: "#8d6e63" },
    { name: "Prop Fabrication", slug: "prop-fabrication", color: "#f59e0b" },
    { name: "Set Construction", slug: "set-construction", color: "#94a3b8" },
    { name: "Painting", slug: "painting", color: "#8b5cf6" },
    { name: "Graphic Design", slug: "graphic-design", color: "#ec4899" },
    { name: "Video Editing", slug: "video-editing", color: "#f43f5e" },
    { name: "Sound Design", slug: "sound-design", color: "#22d3ee" },
    { name: "Project Management", slug: "project-management", color: "#64748b" },
  ];

/**
 * Idempotently seeds reference data (teams + skills). Existing rows
 * (matched by slug) are skipped, so safe to run on every deploy.
 */
export async function seedDefaults(): Promise<void> {
  for (const [i, t] of DEFAULT_TEAMS.entries()) {
    const existing = await db.query.teams.findFirst({
      where: eq(teams.slug, t.slug),
    });
    if (!existing) {
      await db.insert(teams).values({ ...t, order: i });
    }
  }
  for (const [i, s] of DEFAULT_SKILLS.entries()) {
    const existing = await db.query.skills.findFirst({
      where: eq(skills.slug, s.slug),
    });
    if (!existing) {
      await db.insert(skills).values({ ...s, order: i });
    }
  }
  for (const b of STARTER_BADGES) {
    const existing = await db.query.badges.findFirst({
      where: eq(badges.code, b.code),
    });
    if (!existing) {
      await db.insert(badges).values(b);
    }
  }
  for (const [i, s] of DEFAULT_GAME_STATUSES.entries()) {
    const existing = await db.query.gameStatusOptions.findFirst({
      where: eq(gameStatusOptions.slug, s.slug),
    });
    if (!existing) {
      await db.insert(gameStatusOptions).values({ ...s, order: i });
    }
  }
  for (const [i, d] of DEFAULT_DIVISIONS.entries()) {
    const existing = await db.query.divisions.findFirst({
      where: eq(divisions.slug, d.slug),
    });
    if (!existing) {
      await db.insert(divisions).values({ ...d, order: i });
    }
  }
  // Backfill statusSlug from the legacy enum column for any game missing it.
  await db
    .update(games)
    .set({ statusSlug: sql`${games.status}` })
    .where(isNull(games.statusSlug));

  console.log(
    `✓ defaults seeded (${DEFAULT_TEAMS.length} teams, ${DEFAULT_SKILLS.length} skills, ${STARTER_BADGES.length} badges, ${DEFAULT_GAME_STATUSES.length} statuses)`,
  );
}
