import { notFound } from "next/navigation";
import { getGameBySlug, getTasksForGame } from "@/lib/queries";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

const STATUS_HEX: Record<string, string> = {
  TODO: "#71717a",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#eab308",
  BLOCKED: "#ef4444",
  DONE: "#22c55e",
};

export default async function GameTimelinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();
  const taskRows = await getTasksForGame(game.id);

  const dated = taskRows.filter((t) => t.dueDate);
  const undated = taskRows.filter((t) => !t.dueDate);

  // eslint-disable-next-line react-hooks/purity -- per-request timestamp in async RSC
  const now = Date.now();
  if (dated.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-10 text-center text-sm text-muted-foreground">
        No tasks have due dates yet. Add due dates in the List view to see them
        on the timeline.
      </div>
    );
  }

  const times: number[] = [now];
  if (game.launchDate) times.push(game.launchDate.getTime());
  for (const t of dated) {
    times.push(t.dueDate!.getTime());
    times.push(t.createdAt.getTime());
  }
  let start = Math.min(...times);
  let end = Math.max(...times);
  if (end - start < 7 * DAY) end = start + 7 * DAY;
  const pad = Math.max((end - start) * 0.04, DAY);
  start -= pad;
  end += pad;
  const span = end - start;
  const pct = (ms: number) => ((ms - start) / span) * 100;

  // Month gridline ticks.
  const ticks: { label: string; left: number }[] = [];
  const cursor = new Date(start);
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= end) {
    const ms = cursor.getTime();
    if (ms >= start) {
      ticks.push({
        label: cursor.toLocaleDateString(undefined, {
          month: "short",
          year: "2-digit",
        }),
        left: pct(ms),
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Group dated tasks by phase (game.phases is ordered), then "No phase".
  const groups = [
    ...game.phases.map((p) => ({
      name: p.name,
      color: p.color,
      tasks: dated
        .filter((t) => t.phaseId === p.id)
        .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime()),
    })),
    {
      name: "No phase",
      color: "#52525b",
      tasks: dated
        .filter((t) => !t.phaseId)
        .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime()),
    },
  ].filter((g) => g.tasks.length > 0);

  const todayLeft = pct(now);
  const launchLeft = game.launchDate ? pct(game.launchDate.getTime()) : null;

  return (
    <div className="space-y-6 p-6">
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Month axis */}
          <div className="grid grid-cols-[200px_1fr] items-end">
            <div />
            <div className="relative h-5">
              {ticks.map((t) => (
                <span
                  key={t.label + t.left}
                  className="absolute -translate-x-1/2 text-[10px] text-muted-foreground"
                  style={{ left: `${t.left}%` }}
                >
                  {t.label}
                </span>
              ))}
              {launchLeft !== null && launchLeft >= 0 && launchLeft <= 100 ? (
                <span
                  className="absolute -translate-x-1/2 rounded bg-pink-500/20 px-1 text-[10px] text-pink-300"
                  style={{ left: `${launchLeft}%` }}
                >
                  launch
                </span>
              ) : null}
            </div>
          </div>

          {groups.map((g) => (
            <div key={g.name} className="mt-4">
              <div className="mb-1 flex items-center gap-2 px-1">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: g.color }}
                />
                <h3 className="text-sm font-medium">{g.name}</h3>
              </div>
              <div className="rounded-lg border border-border">
                {g.tasks.map((t, i) => {
                  const dueMs = t.dueDate!.getTime();
                  const startMs = Math.max(t.createdAt.getTime(), start);
                  const left = pct(startMs);
                  const width = Math.max(pct(dueMs) - left, 1.5);
                  const overdue = t.status !== "DONE" && dueMs < now;
                  const color = STATUS_HEX[t.status] ?? "#71717a";
                  return (
                    <div
                      key={t.id}
                      className={`grid grid-cols-[200px_1fr] items-center gap-2 px-2 py-1.5 ${
                        i > 0 ? "border-t border-border/60" : ""
                      }`}
                    >
                      <span className="truncate pl-1 text-xs" title={t.title}>
                        {t.title}
                      </span>
                      <div className="relative h-6">
                        {/* today line */}
                        {todayLeft >= 0 && todayLeft <= 100 ? (
                          <span
                            className="absolute top-0 h-full border-l border-dashed border-foreground/40"
                            style={{ left: `${todayLeft}%` }}
                          />
                        ) : null}
                        {/* launch line */}
                        {launchLeft !== null &&
                        launchLeft >= 0 &&
                        launchLeft <= 100 ? (
                          <span
                            className="absolute top-0 h-full border-l border-pink-500/50"
                            style={{ left: `${launchLeft}%` }}
                          />
                        ) : null}
                        {/* task bar */}
                        <span
                          className="absolute top-1/2 h-3 -translate-y-1/2 rounded"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            backgroundColor: color,
                            outline: overdue ? "1px solid #ef4444" : undefined,
                          }}
                          title={`${t.title} — due ${t.dueDate!.toLocaleDateString()}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t border-dashed border-foreground/40" />
          Today
        </span>
        {game.launchDate ? (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0 border-l border-pink-500/60" />
            Launch · {game.launchDate.toLocaleDateString()}
          </span>
        ) : null}
        {Object.entries(STATUS_HEX).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded"
              style={{ backgroundColor: c }}
            />
            {s.replace("_", " ").toLowerCase()}
          </span>
        ))}
      </div>

      {undated.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {undated.length} task{undated.length === 1 ? "" : "s"} without a due
          date aren&rsquo;t shown.
        </p>
      ) : null}
    </div>
  );
}
