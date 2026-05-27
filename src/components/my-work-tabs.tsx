"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { taskPriorityColor, taskStatusColor, taskStatusLabel } from "@/lib/format";

export type OpenTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueMs: number | null;
  gameName: string;
  gameSlug: string;
};

export type CompletedProject = {
  gameName: string;
  gameSlug: string;
  tasks: { id: string; title: string; completedAt: string }[];
};

export type SkillSummary = {
  skill: string;
  color: string;
  levels: { label: string; color: string; count: number }[];
  total: number;
};

export function MyWorkTabs({
  open,
  completed,
  summary,
}: {
  open: OpenTask[];
  completed: CompletedProject[];
  summary: SkillSummary[];
}) {
  const completedCount = completed.reduce((s, p) => s + p.tasks.length, 0);
  // eslint-disable-next-line react-hooks/purity -- overdue comparison at render
  const now = Date.now();

  return (
    <Tabs defaultValue="open">
      <TabsList>
        <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
        <TabsTrigger value="completed">
          Completed ({completedCount})
        </TabsTrigger>
        <TabsTrigger value="summary">Summary</TabsTrigger>
      </TabsList>

      {/* Open tasks */}
      <TabsContent value="open" className="mt-4">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {open.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Nothing open right now. Time to pick up a quest.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {open.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/games/${t.gameSlug}`}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-accent/40"
                  >
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${taskStatusColor(t.status)}`}
                    >
                      {taskStatusLabel(t.status)}
                    </span>
                    <span
                      className={`w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wider ${taskPriorityColor(t.priority)}`}
                    >
                      {t.priority.toLowerCase()}
                    </span>
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.gameName}
                    </span>
                    {t.dueMs !== null ? (
                      <span
                        className={`text-xs ${
                          t.dueMs < now
                            ? "text-red-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {new Date(t.dueMs).toLocaleDateString()}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </TabsContent>

      {/* Completed work */}
      <TabsContent value="completed" className="mt-4 space-y-5">
        {completed.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            No completed tasks yet.
          </p>
        ) : (
          completed.map((p) => (
            <div
              key={p.gameSlug}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <Link
                  href={`/games/${p.gameSlug}`}
                  className="text-sm font-medium hover:underline"
                >
                  {p.gameName}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {p.tasks.length} done
                </span>
              </div>
              <ul className="divide-y divide-border">
                {p.tasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      {t.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(t.completedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </TabsContent>

      {/* Summary */}
      <TabsContent value="summary" className="mt-4">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {summary.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Complete some skill-tagged tasks to build your record.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Skill</th>
                  <th className="px-3 py-2 text-center font-medium">Beginner</th>
                  <th className="px-3 py-2 text-center font-medium">
                    Intermediate
                  </th>
                  <th className="px-3 py-2 text-center font-medium">Advanced</th>
                  <th className="px-3 py-2 text-center font-medium">Expert</th>
                  <th className="px-4 py-2 text-center font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.map((s) => (
                  <tr key={s.skill}>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.skill}
                      </span>
                    </td>
                    {s.levels.map((l) => (
                      <td
                        key={l.label}
                        className="px-3 py-2 text-center font-mono"
                        style={{ color: l.count > 0 ? l.color : undefined }}
                      >
                        {l.count || "—"}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center font-mono font-semibold">
                      {s.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Counts of completed tasks by the difficulty they were tagged with —
          useful for deciding when someone&rsquo;s ready to level up a skill.
        </p>
      </TabsContent>
    </Tabs>
  );
}
