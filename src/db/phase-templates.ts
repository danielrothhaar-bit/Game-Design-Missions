import { eq } from "drizzle-orm";
import { db } from "./index";
import { phaseTemplates, phaseTemplateTasks, teams } from "./schema";

type PhaseKind =
  | "CONCEPT"
  | "NARRATIVE"
  | "PUZZLE_DESIGN"
  | "FABRICATION"
  | "TECH"
  | "PLAYTEST"
  | "LAUNCH"
  | "CUSTOM";

type TemplateTask = { title: string; team: string | null };
type PhaseTemplate = {
  name: string;
  kind: PhaseKind;
  color: string;
  tasks: TemplateTask[];
};

/**
 * The Escape Game's standard 5-phase build, transcribed from the studio
 * flow sheets. `team` is a team slug (see seed-defaults) or null for
 * timeline / section rows.
 */
export const DEFAULT_PHASE_TEMPLATES: PhaseTemplate[] = [
  {
    name: "Concept & Narrative Development",
    kind: "CONCEPT",
    color: "#22c55e",
    tasks: [
      { title: "Concept and Narrative Timeline", team: null },
      { title: "Project Charter", team: "product-design" },
      { title: "Game Flow", team: "product-design" },
      { title: "Scenic Overview", team: "product-design" },
      { title: "Tech Flow", team: "product-design" },
      { title: "Component Design Docs", team: "product-design" },
      { title: "Layout", team: "product-design" },
      { title: "Transitions & Effects Vision", team: "product-design" },
      { title: "Finish Samples List", team: "product-design" },
      {
        title: "R&D Production Estimates",
        team: "creative-engineering-leadership",
      },
      { title: "CAD Estimates", team: "engineering" },
      { title: "Tech Estimates", team: "tech-controls" },
      { title: "Install Estimates", team: "pm" },
      { title: "SKUs in ISOT", team: "product-design" },
      { title: "Prototyping Plan", team: "product-design" },
    ],
  },
  {
    name: "Design, Prototype, and Build",
    kind: "FABRICATION",
    color: "#eab308",
    tasks: [
      { title: "Design, Prototype, and Build Timeline", team: null },
      { title: "Design Timeline", team: null },
      { title: "Prototype Timeline", team: null },
      { title: "Build Timeline", team: null },
      { title: "Prototypes Built", team: "fabrication" },
      { title: "Tech Dev Info", team: "tech-controls" },
      { title: "Tech", team: "tech-controls" },
      { title: "Graphics Drafts", team: "brand" },
      { title: "Branding Package Drafts", team: "brand" },
      { title: "Video Drafts", team: "videography" },
      { title: "Finish Samples", team: "paint" },
      { title: "Install Elevations Draft", team: "architecture" },
      { title: "Review and provide feedback notes", team: "product-design" },
      { title: "Build all SKUs", team: "creative-engineering-leadership" },
    ],
  },
  {
    name: "Demo Testing",
    kind: "PLAYTEST",
    color: "#f97316",
    tasks: [{ title: "Full Game Testing", team: "product-design" }],
  },
  {
    name: "Final Changes & Documentation",
    kind: "CUSTOM",
    color: "#3b82f6",
    tasks: [
      { title: "Final Changes & Documentation Timeline", team: null },
      { title: "TEG Standards", team: "product-design" },
      { title: "QC Docs", team: "product-design" },
      { title: "Game Cost", team: "product-design" },
      { title: "Draft Operations Sheets", team: "product-design" },
      { title: "Punch List Draft", team: "product-design" },
      { title: "Plan Set", team: "architecture" },
      { title: "BOMs", team: "creative-engineering-leadership" },
      {
        title: "Production Labor Estimates",
        team: "creative-engineering-leadership",
      },
      { title: "SKUs in Fulcrum", team: "creative-engineering-leadership" },
      { title: "CAD Designs (Models)", team: "engineering" },
      { title: "Build Docs", team: "engineering" },
      { title: "CNC Files", team: "engineering" },
      { title: "Tech Build Docs", team: "tech-controls" },
      { title: "Branding Package", team: "brand" },
      { title: "Final Graphics", team: "brand" },
      { title: "Final Videos", team: "videography" },
      { title: "Install Plan", team: "pm" },
    ],
  },
  {
    name: "Install & Calibration",
    kind: "LAUNCH",
    color: "#ec4899",
    tasks: [
      { title: "Install & Calibration Timeline", team: null },
      { title: "Install", team: "pm" },
      { title: "Punch", team: "pm" },
      { title: "Tech Punch", team: "tech-controls" },
      { title: "Calibration", team: "product-design" },
      { title: "Final Operations Sheets", team: "product-design" },
      { title: "Clue Sets", team: "product-design" },
      { title: "Walkthrough Videos", team: "product-design" },
      { title: "Maintenance Info", team: "product-design" },
      { title: "360° Scans", team: "product-design" },
      { title: "Reference Sheets", team: "product-design" },
    ],
  },
];

/**
 * Seeds the phase templates — only when none exist yet, so admin edits are
 * never clobbered on redeploy.
 */
export async function seedPhaseTemplates(): Promise<void> {
  const existing = await db.query.phaseTemplates.findMany({ limit: 1 });
  if (existing.length > 0) {
    console.log("✓ phase templates already present, skipping");
    return;
  }

  const teamRows = await db.query.teams.findMany();
  const teamBySlug = new Map(teamRows.map((t) => [t.slug, t.id]));

  for (const [i, p] of DEFAULT_PHASE_TEMPLATES.entries()) {
    const [tpl] = await db
      .insert(phaseTemplates)
      .values({ name: p.name, kind: p.kind, color: p.color, order: i })
      .returning();
    await db.insert(phaseTemplateTasks).values(
      p.tasks.map((t, j) => ({
        phaseTemplateId: tpl.id,
        title: t.title,
        teamId: t.team ? (teamBySlug.get(t.team) ?? null) : null,
        order: j,
      })),
    );
  }
  console.log(`✓ seeded ${DEFAULT_PHASE_TEMPLATES.length} phase templates`);
}

export async function getPhaseTemplates() {
  return db.query.phaseTemplates.findMany({
    orderBy: (p, { asc }) => [asc(p.order)],
    with: {
      tasks: {
        orderBy: (t, { asc }) => [asc(t.order)],
        with: { team: true },
      },
    },
  });
}

// Re-export for callers that only need a team lookup helper.
export async function teamIdBySlug(slug: string): Promise<string | null> {
  const t = await db.query.teams.findFirst({ where: eq(teams.slug, slug) });
  return t?.id ?? null;
}
