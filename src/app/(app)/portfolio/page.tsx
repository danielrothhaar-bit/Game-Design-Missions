import { db } from "@/db";
import {
  listGames,
  listGameStatuses,
  listDivisions,
} from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { GameModule } from "@/components/games/game-module";
import { AlertTriangle, Ban, CircleCheck, Rocket } from "lucide-react";

export const metadata = { title: "Portfolio" };

const DAY = 1000 * 60 * 60 * 24;

export default async function DashboardPage() {
  const [games, statuses, divisions] = await Promise.all([
    listGames(),
    listGameStatuses(),
    listDivisions(),
  ]);
  const statusOrder = new Map(statuses.map((s, i) => [s.slug, i]));
  const statusBy = new Map(statuses.map((s) => [s.slug, s]));
  const statusFor = (g: { statusSlug: string | null; status: string }) =>
    statusBy.get(g.statusSlug ?? g.status);

  const allTasks = await db.query.tasks.findMany();
  const byGame = new Map<string, typeof allTasks>();
  for (const t of allTasks) {
    const arr = byGame.get(t.gameId) ?? [];
    arr.push(t);
    byGame.set(t.gameId, arr);
  }
  // eslint-disable-next-line react-hooks/purity -- per-request timestamp in async RSC
  const now = Date.now();

  const gameStats = games.map((g) => {
    const tasks = byGame.get(g.id) ?? [];
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "DONE").length;
    const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
    const overdue = tasks.filter(
      (t) => t.status !== "DONE" && t.dueDate && t.dueDate.getTime() < now,
    ).length;
    const dueSoon = tasks.filter(
      (t) =>
        t.status !== "DONE" &&
        t.dueDate &&
        t.dueDate.getTime() >= now &&
        t.dueDate.getTime() <= now + 3 * DAY,
    ).length;
    const open = total - done;
    const future = open - overdue - dueSoon;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const daysToLaunch = g.launchDate
      ? Math.round((g.launchDate.getTime() - now) / DAY)
      : null;
    return {
      game: g,
      total,
      done,
      open,
      blocked,
      overdue,
      dueSoon,
      future,
      pct,
      daysToLaunch,
      attention: blocked + overdue,
    };
  });

  // ── Portfolio-level rollups ─────────────────────────────────────────
  const totalProjects = gameStats.length;
  const avgPct =
    totalProjects === 0
      ? 0
      : Math.round(
          gameStats.reduce((s, g) => s + g.pct, 0) / totalProjects,
        );
  const totalBlocked = gameStats.reduce((s, g) => s + g.blocked, 0);
  const totalOverdue = gameStats.reduce((s, g) => s + g.overdue, 0);
  const launchingSoon = gameStats.filter(
    (g) => g.daysToLaunch !== null && g.daysToLaunch >= 0 && g.daysToLaunch <= 30,
  ).length;

  // Status distribution across the whole portfolio (for the segmented bar).
  const statusCounts = statuses
    .map((s) => ({
      slug: s.slug,
      label: s.label,
      color: s.color,
      count: gameStats.filter(
        (g) => (g.game.statusSlug ?? g.game.status) === s.slug,
      ).length,
    }))
    .filter((s) => s.count > 0);

  // Group by division, sort by attention → soonest launch → most open.
  const grouped = divisions
    .map((d) => ({
      division: d,
      items: gameStats
        .filter((s) => s.game.division === d.slug)
        .sort((a, b) => {
          if (b.attention !== a.attention) return b.attention - a.attention;
          const al = a.daysToLaunch ?? Number.POSITIVE_INFINITY;
          const bl = b.daysToLaunch ?? Number.POSITIVE_INFINITY;
          if (al !== bl) return al - bl;
          const sa = statusOrder.get(a.game.statusSlug ?? a.game.status) ?? 99;
          const sb = statusOrder.get(b.game.statusSlug ?? b.game.status) ?? 99;
          if (sa !== sb) return sa - sb;
          return b.open - a.open;
        }),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Portfolio health across every project — what needs attention first.
        </p>
      </header>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Projects" value={totalProjects} />
        <Kpi
          label="Avg completion"
          value={`${avgPct}%`}
          icon={<CircleCheck className="size-4 text-emerald-500" />}
        />
        <Kpi
          label="Launching ≤30d"
          value={launchingSoon}
          icon={<Rocket className="size-4 text-[#2455d1]" />}
        />
        <Kpi
          label="Blocked tasks"
          value={totalBlocked}
          icon={<Ban className="size-4 text-amber-500" />}
          accent={totalBlocked > 0 ? "warn" : undefined}
        />
        <Kpi
          label="Overdue tasks"
          value={totalOverdue}
          icon={<AlertTriangle className="size-4 text-red-500" />}
          accent={totalOverdue > 0 ? "danger" : undefined}
        />
      </div>

      {/* Status distribution */}
      {statusCounts.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Where projects stand
              </h2>
              <span className="text-sm text-muted-foreground">
                {totalProjects} total
              </span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {statusCounts.map((s) => (
                <div
                  key={s.slug}
                  title={`${s.label}: ${s.count}`}
                  style={{
                    width: `${(s.count / totalProjects) * 100}%`,
                    backgroundColor: s.color,
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {statusCounts.map((s) => (
                <span
                  key={s.slug}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-medium text-foreground">{s.count}</span>
                  {s.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        grouped.map(({ division, items }) => (
          <section key={division.slug} className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: division.color }}
              />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {division.label}
              </h2>
              <span className="text-sm text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((s) => (
                <GameModule
                  key={s.game.id}
                  slug={s.game.slug}
                  name={s.game.name}
                  coverColor={s.game.coverColor}
                  coverImage={s.game.coverImage}
                  statusLabel={statusFor(s.game)?.label}
                  counts={{
                    overdue: s.overdue,
                    dueSoon: s.dueSoon,
                    future: s.future,
                  }}
                  daysToLaunch={s.daysToLaunch}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  accent?: "warn" | "danger";
}) {
  const valueClass =
    accent === "danger"
      ? "text-red-600 dark:text-red-400"
      : accent === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className={`text-3xl font-bold tabular-nums ${valueClass}`}>
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

