import { db } from "@/db";
import { listGames } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { gameStatusLabel } from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const games = await listGames();

  const gameStats = await Promise.all(
    games.map(async (g) => {
      const tasks = await db.query.tasks.findMany({
        where: (t, { eq }) => eq(t.gameId, g.id),
      });
      const total = tasks.length;
      const done = tasks.filter((t) => t.status === "DONE").length;
      const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
      // eslint-disable-next-line react-hooks/purity -- per-request timestamp in async RSC
      const now = Date.now();
      const overdue = tasks.filter(
        (t) =>
          t.status !== "DONE" && t.dueDate && t.dueDate.getTime() < now,
      ).length;
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
      const daysToLaunch = g.launchDate
        ? Math.round(
            (g.launchDate.getTime() - now) / (1000 * 60 * 60 * 24),
          )
        : null;
      return { game: g, total, done, blocked, overdue, pct, daysToLaunch };
    }),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio-level view of every game in flight.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {gameStats.map((s) => (
          <Card key={s.game.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">{s.game.name}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {gameStatusLabel(s.game.status)}
                  {s.daysToLaunch !== null
                    ? s.daysToLaunch >= 0
                      ? ` · ${s.daysToLaunch}d to launch`
                      : ` · launched ${-s.daysToLaunch}d ago`
                    : ""}
                </p>
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
                <Stat label="Open" value={s.total - s.done} />
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
