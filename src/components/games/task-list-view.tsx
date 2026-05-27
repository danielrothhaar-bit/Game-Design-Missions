"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  createTask,
  deleteTask,
  setTaskAssignee,
  setTaskSkills,
  setTaskTeam,
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
import {
  SkillSelect,
  TeamSelect,
  type SkillOption,
  type TaskSkill,
  type TeamOption,
} from "./task-meta-selects";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  estimate: number;
  estimateLocked: boolean;
  dueDate: Date | null;
  position: number;
  teamId: string | null;
  createdByName: string | null;
  skills: TaskSkill[];
  assignees: { isPrimary: boolean; user: AssigneeUser }[];
  labels: { label: { id: string; name: string; color: string } }[];
};

const STATUS_FILTERS: Status[] = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE",
];

// Several columns are flexible (fr) so rows spread across the full width
// instead of clustering the meta columns at the right edge.
const GRID_DESIGN =
  "grid grid-cols-[110px_minmax(240px,3fr)_minmax(150px,1.4fr)_110px_minmax(140px,1fr)_120px_56px_32px] items-center gap-3";
const GRID_OTHER =
  "grid grid-cols-[110px_minmax(220px,2.6fr)_minmax(150px,1.2fr)_minmax(150px,1.4fr)_110px_minmax(140px,1fr)_120px_56px_32px] items-center gap-3";

export function TaskListView({
  game,
  initialTasks,
  users,
  teams,
  skills,
  gameDesignTeamId,
}: {
  game: { id: string; slug: string; name: string };
  initialTasks: Task[];
  users: AssigneeUser[];
  teams: TeamOption[];
  skills: SkillOption[];
  gameDesignTeamId: string | null;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [tab, setTab] = useState<"design" | "other">("design");
  const [statusFilter, setStatusFilter] = useState<Set<Status>>(
    new Set(STATUS_FILTERS.filter((s) => s !== "DONE")),
  );
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isDesign = (t: Task) =>
    t.teamId === null || t.teamId === gameDesignTeamId;

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (statusFilter.size > 0 && !statusFilter.has(t.status)) return false;
        if (assigneeFilter)
          return t.assignees.some((a) => a.user.id === assigneeFilter);
        return true;
      }),
    [tasks, statusFilter, assigneeFilter],
  );

  const designTasks = filtered.filter(isDesign);
  const otherTasks = filtered.filter((t) => !isDesign(t));
  const shown = tab === "design" ? designTasks : otherTasks;

  const counts = useMemo(() => {
    const done = tasks.filter((t) => t.status === "DONE").length;
    const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
    // eslint-disable-next-line react-hooks/purity -- overdue snapshot at render
    const now = Date.now();
    const overdue = tasks.filter(
      (t) => t.status !== "DONE" && t.dueDate && t.dueDate.getTime() < now,
    ).length;
    return { total: tasks.length, done, blocked, overdue };
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
      estimateLocked: next !== "TODO" ? true : (before?.estimateLocked ?? false),
    });
    try {
      await updateTaskFields({ id, status: next });
      if (closing) toast.success("Task closed — XP awarded.");
    } catch (err) {
      if (before) mutateLocal(id, before);
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function changeAssignee(id: string, userId: string | null) {
    const before = tasks.find((t) => t.id === id);
    const user = userId ? users.find((u) => u.id === userId) : null;
    mutateLocal(id, { assignees: user ? [{ isPrimary: true, user }] : [] });
    try {
      await setTaskAssignee(id, userId);
    } catch {
      if (before) mutateLocal(id, { assignees: before.assignees });
      toast.error("Could not change assignee");
    }
  }

  async function changeTeam(id: string, teamId: string | null) {
    const before = tasks.find((t) => t.id === id);
    mutateLocal(id, { teamId });
    try {
      await setTaskTeam(id, teamId);
    } catch {
      if (before) mutateLocal(id, { teamId: before.teamId });
      toast.error("Could not change team");
    }
  }

  async function changeSkills(id: string, next: TaskSkill[]) {
    const before = tasks.find((t) => t.id === id);
    mutateLocal(id, { skills: next });
    try {
      await setTaskSkills(id, next);
    } catch {
      if (before) mutateLocal(id, { skills: before.skills });
      toast.error("Could not update skills");
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

  function addTask() {
    setTab("design");
    startTransition(async () => {
      try {
        const created = await createTask({ gameId: game.id, title: "New task" });
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
            position: created.position,
            teamId: created.teamId,
            createdByName: "You",
            skills: [],
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
          <Button size="sm" className="h-8" onClick={addTask}>
            <Plus className="size-3.5" />
            New Task
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border bg-background px-6">
        <TabButton
          active={tab === "design"}
          onClick={() => setTab("design")}
          label="Game Design"
          count={designTasks.length}
        />
        <TabButton
          active={tab === "other"}
          onClick={() => setTab("other")}
          label="Other Teams"
          count={otherTasks.length}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div
            className={cn(
              tab === "other" ? GRID_OTHER : GRID_DESIGN,
              "border-b border-border bg-muted/30 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
            )}
          >
            <span>Status</span>
            <span>Item</span>
            {tab === "other" ? <span>Responsible Team</span> : null}
            <span>Skills</span>
            <span>Priority</span>
            <span>Assignee</span>
            <span>Due</span>
            <span className="text-center">Est</span>
            <span />
          </div>

          {shown.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {tab === "design"
                ? "No Game Design tasks match these filters."
                : "No tasks assigned to other teams match these filters."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {shown.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  showTeam={tab === "other"}
                  users={users}
                  teams={teams}
                  skills={skills}
                  onChangeStatus={changeStatus}
                  onChangeAssignee={changeAssignee}
                  onChangeTeam={changeTeam}
                  onChangeSkills={changeSkills}
                  onCommitField={commitField}
                  onDelete={remove}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>
    </button>
  );
}

function TaskRow({
  task,
  showTeam,
  users,
  teams,
  skills,
  onChangeStatus,
  onChangeAssignee,
  onChangeTeam,
  onChangeSkills,
  onCommitField,
  onDelete,
}: {
  task: Task;
  showTeam: boolean;
  users: AssigneeUser[];
  teams: TeamOption[];
  skills: SkillOption[];
  onChangeStatus: (id: string, next: Status) => void;
  onChangeAssignee: (id: string, userId: string | null) => void;
  onChangeTeam: (id: string, teamId: string | null) => void;
  onChangeSkills: (id: string, next: TaskSkill[]) => void;
  onCommitField: <K extends keyof Task>(id: string, key: K, value: Task[K]) => void;
  onDelete: (id: string) => void;
}) {
  const primary = task.assignees.find((a) => a.isPrimary) ?? task.assignees[0];

  return (
    <li
      className={cn(
        "group px-3 py-2 hover:bg-accent/30",
        showTeam ? GRID_OTHER : GRID_DESIGN,
      )}
    >
      <StatusPill
        status={task.status}
        onChange={(s) => onChangeStatus(task.id, s)}
      />
      <div
        className="min-w-0"
        title={task.createdByName ? `Created by ${task.createdByName}` : undefined}
      >
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
      {showTeam ? (
        <TeamSelect
          teams={teams}
          value={task.teamId}
          onChange={(id) => onChangeTeam(task.id, id)}
        />
      ) : null}
      <SkillSelect
        skills={skills}
        value={task.skills}
        onChange={(next) => onChangeSkills(task.id, next)}
      />
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
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Assignee:</span>
      <AssigneeSelect
        users={users}
        assignedId={value}
        onChange={(uid) => onChange(uid)}
      />
      {value ? (
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
