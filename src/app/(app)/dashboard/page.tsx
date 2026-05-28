import { db } from "@/db";
import {
  listGames,
  listGameStatuses,
  listDivisions,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameShield } from "@/components/games/game-shield";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [games, statuses, divisions] = await Promise.all([
    listGames(),
    listGameStatuses(),
    listDivisions(),
  ]);
  const statusOrder = new Map(statuses.map((s, i) => [s.slug, i]));
  const statusLabel = (g: { statusSlug: string | null; status: string }) =>
    statuses.find((s) => s.slug === (g.statusSlug ?? g.status))?.label ??
    (g.statusSlug ?? g.status);

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
    const open = total - done;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const daysToLaunch = g.launchDate
      ? Math.round((g.launchDate.getTime() - now) / (1000 * 60 * 60 * 24))
      : null;
    return { game: g, total, done, open, blocked, overdue, pct, daysToLaunch };
  });

  // Group by division (division order), then sort by status, then most-open.
  const grouped = divisions
    .map((d) => ({
      division: d,
      items: gameStats
        .filter((s) => s.game.division === d.slug)
        .sort((a, b) => {
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
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio view by division — most open work first.
        </p>
      </header>

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
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {division.label}
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((s) => (
                <Card key={s.game.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div className="flex min-w-0 items-start gap-3">
                      <GameShield
                        slug={s.game.slug}
                        size={40}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <CardTitle className="text-base">{s.game.name}</CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {statusLabel(s.game)}
                          {s.daysToLaunch !== null
                            ? s.daysToLaunch >= 0
                              ? ` · ${s.daysToLaunch}d to launch`
                              : ` · launched ${-s.daysToLaunch}d ago`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{s.pct}%</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="h-2 w-full overflow-hidden rounded bg-secondary">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${s.pct}%`,
                          backgroundColor: s.game.coverColor,
                        }}
                      />
                    </div>
                    <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                      <Stat label="Open" value={s.open} />
                      <Stat
                        label="Blocked"
                        value={s.blocked}
                        accent={s.blocked > 0 ? "warn" : undefined}
                      />
                      <Stat
                        label="Overdue"
                        value={s.overdue}
                        accent={s.overdue > 0 ? "danger" : undefined}
                      />
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "warn" | "danger";
}) {
  const c =
    accent === "danger"
      ? "text-red-400"
      : accent === "warn"
        ? "text-amber-400"
        : "";
  return (
    <div className="rounded-md border border-border/60 py-2">
      <div className={`text-base font-semibold ${c}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
