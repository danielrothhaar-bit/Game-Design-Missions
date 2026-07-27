/**
 * Public, DB-free preview of the fantasy/parchment redesign. Not linked in
 * the nav — visit /preview directly to see it. Built with mock data so the
 * page renders even without a database connection.
 */

export const dynamic = "force-static";
export const metadata = { title: "Aesthetic preview" };

export default function PreviewPage() {
  return (
    <div className="min-h-screen w-full px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <Header />
        <Section title="My Quests" subtitle="Mock of the My Work page">
          <MyWorkMock />
        </Section>
        <Section title="The Heist · Open Quests" subtitle="Mock of a project's task list">
          <GameListMock />
        </Section>
        <Section title="Hall of Heroes" subtitle="Mock of the Team workload page">
          <TeamMock />
        </Section>
        <Section title="Scribes' Quarters" subtitle="Mock of the Admin XP panel">
          <AdminMock />
        </Section>
        <Section title="Cross the Threshold" subtitle="Mock of the login screen">
          <LoginMock />
        </Section>
        <Footer />
      </div>
    </div>
  );
}

/* ────────── Layout helpers ────────── */

function Header() {
  return (
    <div className="text-center">
      <p className="pixel-tag text-[color:var(--muted-foreground)]">— Quests —</p>
      <h1 className="mt-2 text-4xl font-bold tracking-wide text-foreground sm:text-5xl">
        The Codex of Quests
      </h1>
      <p className="mt-2 text-sm italic text-muted-foreground">
        A preview of the parchment &amp; ink redesign
      </p>
      <FantasyDivider />
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="pixel-tag text-[color:var(--muted-foreground)]">
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  );
}

function FantasyDivider() {
  return (
    <div className="fantasy-divider mx-auto mt-5 max-w-md">
      <span className="gem" />
    </div>
  );
}

function Footer() {
  return (
    <div className="pt-6 text-center text-xs italic text-muted-foreground">
      Preview only — nothing here is connected to your real data.
    </div>
  );
}

/* ────────── Reusable mock bits ────────── */

function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`fantasy-panel p-5 ${className ?? ""}`}>
      {title ? (
        <h3 className="mb-3 text-base font-semibold tracking-wide text-foreground">
          {title}
        </h3>
      ) : null}
      {children}
    </div>
  );
}

function FButton({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "primary";
}) {
  return (
    <button
      className="fantasy-button px-3.5 py-1.5"
      data-variant={variant}
      type="button"
    >
      {children}
    </button>
  );
}

function PriorityTag({ p }: { p: "URGENT" | "HIGH" | "MEDIUM" | "LOW" }) {
  const color =
    p === "URGENT"
      ? "text-[oklch(0.42_0.18_28)]"
      : p === "HIGH"
        ? "text-[oklch(0.55_0.16_60)]"
        : p === "MEDIUM"
          ? "text-[oklch(0.45_0.10_240)]"
          : "text-muted-foreground";
  return (
    <span className={`pixel-tag w-14 shrink-0 ${color}`}>{p.toLowerCase()}</span>
  );
}

function ScopeChip({ s }: { s: "S" | "M" | "L" | "XL" }) {
  return (
    <span className="pixel-tag inline-flex h-6 min-w-7 items-center justify-center border border-border bg-secondary px-1.5 text-foreground">
      {s}
    </span>
  );
}

/* ────────── My Work mock ────────── */

function MyWorkMock() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <Panel title="Open quests">
        <ul className="divide-y divide-border/60">
          {[
            { t: "Forge the Ironheart key prop", p: "URGENT" as const, s: "L" as const, game: "Prison Break" },
            { t: "Final pass on Cosmic Crisis intro VO", p: "HIGH" as const, s: "M" as const, game: "Cosmic Crisis" },
            { t: "Layout review — Ruins atrium", p: "MEDIUM" as const, s: "S" as const, game: "Ruins" },
            { t: "Wire the lantern relays", p: "MEDIUM" as const, s: "M" as const, game: "Yeti" },
            { t: "Storyboard meatball Act II", p: "LOW" as const, s: "S" as const, game: "Meatballs" },
          ].map((row) => (
            <li
              key={row.t}
              className="flex items-center gap-3 py-2.5"
            >
              <span className="pixel-tag w-16 shrink-0 border border-border bg-secondary px-1.5 py-0.5 text-foreground">
                Todo
              </span>
              <PriorityTag p={row.p} />
              <span className="flex-1 text-[15px] text-foreground">{row.t}</span>
              <span className="hidden text-xs italic text-muted-foreground md:block">
                {row.game}
              </span>
              <ScopeChip s={row.s} />
            </li>
          ))}
        </ul>
      </Panel>

      <div className="space-y-4">
        <Panel title="Character">
          <p className="text-sm italic text-muted-foreground">Daniel of TEG</p>
          <p className="pixel-tag mt-1 text-[color:var(--primary)]">
            Lv 14 — Architect
          </p>
          <div className="mt-3 h-2 w-full border border-border bg-input">
            <div
              className="h-full bg-[oklch(0.55_0.16_28)]"
              style={{ width: "62%" }}
            />
          </div>
          <p className="pixel-tag mt-2 text-[color:var(--muted-foreground)]">
            1,860 / 3,000 xp
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["First Quest", "On-Time x10", "Hot Streak"].map((b) => (
              <span
                key={b}
                className="border border-border bg-secondary px-1.5 py-0.5 text-[11px] text-foreground"
              >
                ✦ {b}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Streak">
          <p className="font-display text-3xl font-bold text-[oklch(0.45_0.16_30)]">
            7 <span className="text-base text-muted-foreground">days</span>
          </p>
          <p className="pixel-tag mt-1 text-[color:var(--muted-foreground)]">
            Longest: 14
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ────────── Game list mock ────────── */

function GameListMock() {
  return (
    <Panel>
      <div className="flex items-center gap-2 pb-3">
        <FButton variant="primary">+ New Quest</FButton>
        <FButton>Game Design · 12</FButton>
        <FButton>Other Teams · 4</FButton>
        <span className="ml-auto pixel-tag text-[color:var(--muted-foreground)]">
          8 of 16 done
        </span>
      </div>
      <div className="overflow-hidden border border-border">
        <div className="grid grid-cols-[90px_1fr_120px_70px_120px_70px] items-center gap-2 border-b border-border bg-secondary px-3 py-2">
          {["Status", "Item", "Skills", "Priority", "Assignee", "Scope"].map((h) => (
            <span
              key={h}
              className="pixel-tag text-[color:var(--muted-foreground)]"
            >
              {h}
            </span>
          ))}
        </div>
        <ul className="divide-y divide-border/60">
          {[
            { st: "Todo", t: "Carve runic puzzle keystones", sk: "Prop · Adv", p: "HIGH" as const, who: "Mara", s: "L" as const },
            { st: "WIP", t: "Test the snow-room cascade trigger", sk: "Electronics · Int", p: "MEDIUM" as const, who: "Owen", s: "M" as const },
            { st: "Review", t: "Director playthrough notes round 2", sk: "Narrative · Exp", p: "URGENT" as const, who: "Daniel", s: "XL" as const },
            { st: "Todo", t: "Source iron-finish hinges", sk: "Set · Beg", p: "LOW" as const, who: "—", s: "S" as const },
          ].map((row) => (
            <li
              key={row.t}
              className="grid grid-cols-[90px_1fr_120px_70px_120px_70px] items-center gap-2 px-3 py-2.5"
            >
              <span className="pixel-tag border border-border bg-background px-1.5 py-0.5 text-center text-foreground">
                {row.st}
              </span>
              <span className="text-[15px] text-foreground">{row.t}</span>
              <span className="text-xs italic text-muted-foreground">{row.sk}</span>
              <PriorityTag p={row.p} />
              <span className="text-sm text-foreground">{row.who}</span>
              <span className="flex justify-center">
                <ScopeChip s={row.s} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/* ────────── Team mock ────────── */

function TeamMock() {
  const people = [
    { name: "Mara", load: 28 },
    { name: "Owen", load: 22 },
    { name: "Daniel", load: 18 },
    { name: "Reese", load: 9 },
    { name: "Tova", load: 5 },
  ];
  const max = Math.max(...people.map((p) => p.load));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Workload by hero">
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.name} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 text-foreground">{p.name}</span>
              <div className="flex-1 border border-border bg-input">
                <div
                  className="h-4 bg-[oklch(0.50_0.14_60)]"
                  style={{ width: `${(p.load / max) * 100}%` }}
                />
              </div>
              <span className="pixel-tag w-8 text-right text-[color:var(--foreground)]">
                {p.load}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Each hero's quests">
        <div className="flex gap-1 border-b border-border pb-2">
          {["Mara", "Owen", "Daniel", "Reese"].map((n, i) => (
            <span
              key={n}
              className={`px-2.5 py-1 text-sm ${
                i === 0
                  ? "border border-border border-b-card bg-card text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {n}
            </span>
          ))}
        </div>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <PriorityTag p="HIGH" />
            <span className="flex-1 text-foreground">
              Forge the Ironheart key prop
            </span>
            <ScopeChip s="L" />
          </li>
          <li className="flex items-center gap-2">
            <PriorityTag p="MEDIUM" />
            <span className="flex-1 text-foreground">
              Aging pass on tavern signage
            </span>
            <ScopeChip s="M" />
          </li>
          <li className="flex items-center gap-2">
            <PriorityTag p="LOW" />
            <span className="flex-1 text-foreground">
              Crate of red-herring trinkets
            </span>
            <ScopeChip s="S" />
          </li>
        </ul>
      </Panel>
    </div>
  );
}

/* ────────── Admin mock ────────── */

function AdminMock() {
  return (
    <Panel title="XP &amp; levels">
      <p className="drop-cap text-[15px] leading-relaxed text-foreground">
        Adjust the laws of the realm. Every quest&rsquo;s reward is woven from
        the skills upon it, its scope, its urgency, and the timing of its
        completion. Set the weights below — bigger numbers, bigger rewards.
      </p>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {[
          ["XP per weight point", "10"],
          ["On-time multiplier", "100%"],
          ["Early multiplier", "125%"],
          ["Late multiplier", "75%"],
        ].map(([k, v]) => (
          <div
            key={k}
            className="flex items-center justify-between border border-border bg-background px-3 py-2"
          >
            <span className="text-foreground">{k}</span>
            <span className="pixel-tag text-[color:var(--primary)]">{v}</span>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="pixel-tag mb-2 text-[color:var(--muted-foreground)]">
          Difficulty weight (per skill level)
        </p>
        <div className="grid grid-cols-4 gap-2 text-sm">
          {[
            ["Beginner", 1, "oklch(0.45 0.13 145)"],
            ["Intermediate", 2, "oklch(0.55 0.13 90)"],
            ["Advanced", 4, "oklch(0.45 0.16 28)"],
            ["Expert", 7, "oklch(0.40 0.14 310)"],
          ].map(([label, n, color]) => (
            <div
              key={label as string}
              className="border border-border bg-background px-2 py-2 text-center"
            >
              <p className="pixel-tag" style={{ color: color as string }}>
                {label}
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">
                {n}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <FButton>Cancel</FButton>
        <FButton variant="primary">Inscribe</FButton>
      </div>
    </Panel>
  );
}

/* ────────── Login mock ────────── */

function LoginMock() {
  return (
    <div className="mx-auto max-w-md">
      <Panel>
        <div className="text-center">
          <p className="pixel-tag text-[color:var(--muted-foreground)]">
            — The Hall of Records —
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-foreground">
            Speak, traveler
          </h3>
          <FantasyDivider />
        </div>
        <form className="mt-4 space-y-3">
          <label className="block">
            <span className="pixel-tag text-[color:var(--muted-foreground)]">
              Name
            </span>
            <input
              type="email"
              defaultValue="daniel@theescapegame.com"
              className="mt-1 w-full border border-border bg-input px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="block">
            <span className="pixel-tag text-[color:var(--muted-foreground)]">
              Word of passage
            </span>
            <input
              type="password"
              defaultValue="••••••••••"
              className="mt-1 w-full border border-border bg-input px-3 py-2 text-sm text-foreground"
            />
          </label>
          <div className="pt-2 text-center">
            <FButton variant="primary">Enter the Realm</FButton>
          </div>
        </form>
      </Panel>
    </div>
  );
}
