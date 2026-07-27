"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Sun } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { taskPriorityColor, taskStatusColor, taskStatusLabel } from "@/lib/format";
import { claimTask, quickAddTask, setDoToday } from "@/server/actions/tasks";
import { cn } from "@/lib/utils";

export type UnassignedTask = {
  id: string;
  title: string;
  priority: string;
  gameName: string;
  gameSlug: string;
};

export type OpenTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueMs: number | null;
  gameName: string;
  gameSlug: string;
  doToday: boolean;
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

type Project = { id: string; name: string };

export function MyWorkTabs({
  open,
  completed,
  summary,
  unassigned,
  projects,
}: {
  open: OpenTask[];
  completed: CompletedProject[];
  summary: SkillSummary[];
  unassigned: UnassignedTask[];
  projects: Project[];
}) {
  const router = useRouter();
  const [, startAction] = useTransition();
  const completedCount = completed.reduce((s, p) => s + p.tasks.length, 0);
  // eslint-disable-next-line react-hooks/purity -- overdue comparison at render
  const now = Date.now();

  const today = open.filter((t) => t.doToday);

  // New task dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");

  function claim(id: string) {
    startAction(async () => {
      try {
        await claimTask(id);
        toast.success("Task claimed — it's now yours.");
        router.refresh();
      } catch {
        toast.error("Could not claim task");
      }
    });
  }

  function toggleToday(id: string, next: boolean) {
    startAction(async () => {
      try {
        await setDoToday(id, next);
        router.refresh();
      } catch {
        toast.error("Could not update Today list");
      }
    });
  }

  function createTask() {
    if (!projectId || !title.trim()) {
      toast.error("Pick a project and enter a title.");
      return;
    }
    startAction(async () => {
      try {
        await quickAddTask(projectId, title.trim());
        toast.success("Task created and assigned to you.");
        setTitle("");
        setDialogOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not create task");
      }
    });
  }

  return (
    <Tabs defaultValue="open">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="today">Today ({today.length})</TabsTrigger>
          <TabsTrigger value="unassigned">
            Unassigned ({unassigned.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedCount})
          </TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-3.5" />
          New Task
        </Button>
      </div>

      {/* Open tasks */}
      <TabsContent value="open" className="mt-4">
        <TaskList
          tasks={open}
          now={now}
          empty="Nothing open right now. Time to pick up a quest."
          onToggleToday={toggleToday}
        />
      </TabsContent>

      {/* Today */}
      <TabsContent value="today" className="mt-4">
        <TaskList
          tasks={today}
          now={now}
          empty="Nothing planned for today yet. Hit “Do Today” on an open task."
          onToggleToday={toggleToday}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Your Today list clears automatically at the start of each day.
        </p>
      </TabsContent>

      {/* Unassigned — claimable */}
      <TabsContent value="unassigned" className="mt-4">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {unassigned.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No unassigned tasks — everything has an owner.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {unassigned.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-6 py-3">
                  <span
                    className={`w-14 shrink-0 text-xs font-semibold uppercase tracking-wider ${taskPriorityColor(t.priority)}`}
                  >
                    {t.priority.toLowerCase()}
                  </span>
                  <Link
                    href={`/games/${t.gameSlug}`}
                    className="flex-1 truncate hover:underline"
                  >
                    {t.title}
                  </Link>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {t.gameName}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => claim(t.id)}
                  >
                    Claim
                  </Button>
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
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          {summary.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Complete some skill-tagged tasks to build your record.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
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

      {/* New Task dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nt-project">Project</Label>
              <select
                id="nt-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt-title">Task</Label>
              <Input
                id="nt-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs doing?"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && createTask()}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              It&rsquo;ll be created in that project and assigned to you.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createTask}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

function TaskList({
  tasks,
  now,
  empty,
  onToggleToday,
}: {
  tasks: OpenTask[];
  now: number;
  empty: string;
  onToggleToday: (id: string, next: boolean) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {tasks.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <span
                className={`hidden shrink-0 rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider sm:inline ${taskStatusColor(t.status)}`}
              >
                {taskStatusLabel(t.status)}
              </span>
              <span
                className={`w-12 shrink-0 text-xs font-semibold uppercase tracking-wider ${taskPriorityColor(t.priority)}`}
              >
                {t.priority.toLowerCase()}
              </span>
              <Link
                href={`/games/${t.gameSlug}`}
                className="flex-1 truncate hover:underline"
              >
                {t.title}
              </Link>
              <span className="hidden text-xs text-muted-foreground md:block">
                {t.gameName}
              </span>
              {t.dueMs !== null ? (
                <span
                  className={`hidden text-xs sm:block ${
                    t.dueMs < now ? "text-red-400" : "text-muted-foreground"
                  }`}
                >
                  {new Date(t.dueMs).toLocaleDateString()}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onToggleToday(t.id, !t.doToday)}
                title={t.doToday ? "Remove from Today" : "Do today"}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
                  t.doToday
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                <Sun className="size-3.5" />
                {t.doToday ? "Today" : "Do Today"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
