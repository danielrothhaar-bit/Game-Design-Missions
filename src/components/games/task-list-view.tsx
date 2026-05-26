"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  createTask,
  deleteTask,
  setTaskAssignee,
  updateTaskFields,
} from "@/server/actions/tasks";
import { InlineEditNumber, InlineEditText } from "./inline-edit-text";
import {
  PrioritySelect,
  StatusPill,
  type Priority,
  type Status,
} from "./status-select";
import { AssigneeSelect, type AssigneeUser } from "./assignee-select";
import { DueDatePopover } from "./due-date-popover";

type Task = {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  estimate: number;
  estimateLocked: boolean;
  dueDate: Date | null;
  phaseId: string | null;
  position: number;
  assignees: { isPrimary: boolean; user: AssigneeUser }[];
  labels: { label: { id: string; name: string; color: string } }[];
};

type Phase = { id: string; name: string; color: string; order: number };

const STATUS_FILTERS: Status[] = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE",
];

export function TaskListView({
  game,
  phases,
  initialTasks,
  users,
}: {
  game: { id: string; slug: string; name: string };
  phases: Phase[];
  initialTasks: Task[];
  users: AssigneeUser[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [statusFilter, setStatusFilter] = useState<Set<Status>>(
    new Set(STATUS_FILTERS.filter((s) => s !== "DONE")),
  );
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const groups = useMemo(() => {
    const visible = tasks.filter((t) => {
      if (statusFilter.size > 0 && !statusFilter.has(t.status)) return false;
      if (assigneeFilter) {
        return t.assignees.some((a) => a.user.id === assigneeFilter);
      }
      return true;
    });
    const byPhase = new Map<string | null, Task[]>();
    for (const p of phases) byPhase.set(p.id, []);
    byPhase.set(null, []);
    for (const t of visible) {
      const key = t.phaseId ?? null;
      const list = byPhase.get(key) ?? [];
      list.push(t);
      byPhase.set(key, list);
    }
    return phases.map((p) => ({
      phase: p,
      tasks: byPhase.get(p.id) ?? [],
    }));
  }, [tasks, phases, statusFilter, assigneeFilter]);

  const counts = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- snapshot per render for overdue badge
    const now = Date.now();
    return {
      total: tasks.length,
      done: tasks.filter((t) => t.status === "DONE").length,
      blocked: tasks.filter((t) => t.status === "BLOCKED").length,
      overdue: tasks.filter(
        (t) => t.status !== "DONE" && t.dueDate && t.dueDate.getTime() < now,
      ).length,
    };
  }, [tasks]);

  function toggleStatus(s: Status) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function mutateLocal(id: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function commitField<K extends keyof Task>(
    id: string,
    key: K,
    value: Task[K],
  ) {
    const before = tasks.find((t) => t.id === id);
    mutateLocal(id, { [key]: value } as Partial<Task>);
    try {
      await updateTaskFields({
        id,
        [key]: value as unknown,
      } as Parameters<typeof updateTaskFields>[0]);
    } catch (err) {
      if (before) mutateLocal(id, { [key]: before[key] } as Partial<Task>);
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function changeStatus(id: string, next: Status) {
    const before = tasks.find((t) => t.id === id);
    const closing = next === "DONE" && before?.status !== "DONE";
    mutateLocal(id, {
      status: next,
      estimateLocked:
        next !== "TODO" ? true : (before?.estimateLocked ?? false),
    });
    try {
      await updateTaskFields({ id, status: next });
      if (closing) {
        toast.success("Task closed — XP awarded.");
      }
    } catch (err) {
      if (before) mutateLocal(id, before);
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function changeAssignee(id: string, userId: string | null) {
    const before = tasks.find((t) => t.id === id);
    const user = userId ? users.find((u) => u.id === userId) : null;
    mutateLocal(id, {
      assignees: user ? [{ isPrimary: true, user }] : [],
    });
    try {
      await setTaskAssignee(id, userId);
    } catch {
      if (before) mutateLocal(id, { assignees: before.assignees });
      toast.error("Could not change assignee");
    }
  }

  async function remove(id: string) {
    const before = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTask(id);
      toast.success("Task deleted");
    } catch {
      setTasks(before);
      toast.error("Delete failed");
    }
  }

  function addTask(phaseId: string, title: string) {
    startTransition(async () => {
      try {
        const created = await createTask({ gameId: game.id, phaseId, title });
        setTasks((prev) => [
          ...prev,
          {
            id: created.id,
            title: created.title,
            status: created.status as Status,
            priority: created.priority as Priority,
            estimate: created.estimate,
            estimateLocked: created.estimateLocked,
            dueDate: created.dueDate,
            phaseId: created.phaseId,
            position: created.position,
            assignees: [],
            labels: [],
          },
        ]);
      } catch {
        toast.error("Could not create task");
      }
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-6 py-3">
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((s) => {
            const on = statusFilter.has(s);
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-wider transition-colors ${
                  on
                    ? "border-foreground/30 bg-foreground/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {s.replace("_", " ").toLowerCase()}
              </button>
            );
          })}
        </div>

        <div className="ml-2 h-6 w-px bg-border" />

        <AssigneeFilterButton
          users={users}
          value={assigneeFilter}
          onChange={setAssigneeFilter}
        />

        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{counts.done}</strong> of{" "}
            {counts.total} done
          </span>
          {counts.blocked > 0 ? (
            <Badge variant="secondary" className="text-amber-400">
              {counts.blocked} blocked
            </Badge>
          ) : null}
          {counts.overdue > 0 ? (
            <Badge variant="secondary" className="text-red-400">
              {counts.overdue} overdue
            </Badge>
          ) : null}
          {phases.length > 0 ? (
            <Button
              size="sm"
              className="h-8"
              onClick={() => addTask(phases[0].id, "New task")}
            >
              <Plus className="size-3.5" />
              New Task
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {groups.every((g) => g.tasks.length === 0) ? (
          <div className="grid place-items-center py-16 text-center text-sm text-muted-foreground">
            No tasks match these filters.
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(({ phase, tasks: phaseTasks }) => (
              <PhaseGroup
                key={phase.id}
                phase={phase}
                tasks={phaseTasks}
                users={users}
                onChangeStatus={changeStatus}
                onChangeAssignee={changeAssignee}
                onCommitField={commitField}
                onCreate={(title) => addTask(phase.id, title)}
                onDelete={remove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseGroup({
  phase,
  tasks,
  users,
  onChangeStatus,
  onChangeAssignee,
  onCommitField,
  onCreate,
  onDelete,
}: {
  phase: Phase;
  tasks: Task[];
  users: AssigneeUser[];
  onChangeStatus: (id: string, next: Status) => void;
  onChangeAssignee: (id: string, userId: string | null) => void;
  onCommitField: <K extends keyof Task>(id: string, key: K, value: Task[K]) => void;
  onCreate: (title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <section>
      <header className="mb-2 flex items-center gap-2">
        <span
          className="inline-block size-2.5 rounded-full"
          style={{ backgroundColor: phase.color }}
        />
        <h3 className="text-sm font-medium">{phase.name}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </header>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {tasks.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">
            No tasks in this phase yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                users={users}
                onChangeStatus={onChangeStatus}
                onChangeAssignee={onChangeAssignee}
                onCommitField={onCommitField}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
        <div className="border-t border-border/60">
          {adding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim()) {
                  onCreate(draft.trim());
                  setDraft("");
                  setAdding(false);
                }
              }}
              className="flex items-center gap-2 px-3 py-2"
            >
              <Input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Task title…"
                onBlur={() => {
                  if (!draft.trim()) setAdding(false);
                }}
                className="h-8 text-sm"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-accent/40"
            >
              <Plus className="size-3.5" />
              Add task
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function TaskRow({
  task,
  users,
  onChangeStatus,
  onChangeAssignee,
  onCommitField,
  onDelete,
}: {
  task: Task;
  users: AssigneeUser[];
  onChangeStatus: (id: string, next: Status) => void;
  onChangeAssignee: (id: string, userId: string | null) => void;
  onCommitField: <K extends keyof Task>(id: string, key: K, value: Task[K]) => void;
  onDelete: (id: string) => void;
}) {
  const primary = task.assignees.find((a) => a.isPrimary) ?? task.assignees[0];

  return (
    <li className="group grid grid-cols-[110px_1fr_120px_140px_120px_56px_28px] items-center gap-3 px-3 py-2 hover:bg-accent/30">
      <StatusPill
        status={task.status}
        onChange={(s) => onChangeStatus(task.id, s)}
      />
      <div className="min-w-0">
        <InlineEditText
          value={task.title}
          onCommit={(next) => onCommitField(task.id, "title", next)}
          className="text-sm"
          placeholder="Untitled task"
        />
        {task.labels.length > 0 ? (
          <div className="mt-0.5 flex flex-wrap gap-1 pl-1.5">
            {task.labels.map((tl) => (
              <span
                key={tl.label.id}
                className="rounded px-1.5 py-0.5 text-[10px]"
                style={{
                  backgroundColor: `${tl.label.color}22`,
                  color: tl.label.color,
                }}
              >
                {tl.label.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <PrioritySelect
        value={task.priority}
        onChange={(p) => onCommitField(task.id, "priority", p)}
      />
      <AssigneeSelect
        users={users}
        assignedId={primary?.user.id ?? null}
        onChange={(uid) => onChangeAssignee(task.id, uid)}
      />
      <DueDatePopover
        value={task.dueDate}
        onChange={(d) => onCommitField(task.id, "dueDate", d)}
      />
      <InlineEditNumber
        value={task.estimate}
        disabled={task.estimateLocked}
        onCommit={(n) => onCommitField(task.id, "estimate", n)}
      />
      <button
        aria-label="Delete task"
        onClick={() => {
          if (confirm("Delete this task?")) onDelete(task.id);
        }}
        className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

function AssigneeFilterButton({
  users,
  value,
  onChange,
}: {
  users: AssigneeUser[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const u = value ? users.find((x) => x.id === value) : null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Assignee:</span>
      <AssigneeSelect
        users={users}
        assignedId={value}
        onChange={(uid) => onChange(uid)}
      />
      {u || value ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChange(null)}
          className="h-6 px-1.5 text-xs"
        >
          clear
        </Button>
      ) : null}
    </div>
  );
}
