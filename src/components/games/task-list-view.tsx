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
import { InlineEditText } from "./inline-edit-text";
import {
  PRIORITIES,
  PrioritySelect,
  ScopeSelect,
  StatusPill,
  type Priority,
  type ScopeSize,
  type Status,
} from "./status-select";
import { xpForTaskClose, type XpConfig } from "@/lib/xp";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  scopeSize: ScopeSize;
  scopeLocked: boolean;
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

type SortKey =
  | "status"
  | "title"
  | "team"
  | "skill"
  | "priority"
  | "assignee"
  | "due"
  | "scope";

const STATUS_ORDER: Record<string, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  IN_REVIEW: 2,
  BLOCKED: 3,
  DONE: 4,
};
const PRIORITY_ORDER: Record<string, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  URGENT: 3,
};
const SCOPE_ORDER: Record<string, number> = { S: 0, M: 1, L: 2, XL: 3 };

export function TaskListView({
  game,
  initialTasks,
  users,
  teams,
  skills,
  gameDesignTeamId,
  xpConfig,
}: {
  game: { id: string; slug: string; name: string };
  initialTasks: Task[];
  users: AssigneeUser[];
  teams: TeamOption[];
  skills: SkillOption[];
  gameDesignTeamId: string | null;
  xpConfig: XpConfig;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [tab, setTab] = useState<"design" | "other">("design");
  const [statusFilter, setStatusFilter] = useState<Set<Status>>(
    new Set(STATUS_FILTERS.filter((s) => s !== "DONE")),
  );
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set());
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(
    null,
  );
  const [, startTransition] = useTransition();

  const isDesign = (t: Task) =>
    t.teamId === null || t.teamId === gameDesignTeamId;

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (statusFilter.size > 0 && !statusFilter.has(t.status)) return false;
        if (priorityFilter.size > 0 && !priorityFilter.has(t.priority))
          return false;
        if (assigneeFilter && !t.assignees.some((a) => a.user.id === assigneeFilter))
          return false;
        if (teamFilter && t.teamId !== teamFilter) return false;
        if (skillFilter && !t.skills.some((s) => s.skillId === skillFilter))
          return false;
        return true;
      }),
    [tasks, statusFilter, priorityFilter, assigneeFilter, teamFilter, skillFilter],
  );

  const teamName = (id: string | null) =>
    id ? (teams.find((x) => x.id === id)?.name ?? "") : "";
  const assigneeName = (t: Task) => {
    const a = t.assignees.find((x) => x.isPrimary) ?? t.assignees[0];
    return (a?.user.name ?? a?.user.email ?? "").toLowerCase();
  };
  function sortVal(t: Task, key: SortKey): string | number {
    switch (key) {
      case "status":
        return STATUS_ORDER[t.status] ?? 0;
      case "title":
        return t.title.toLowerCase();
      case "team":
        return teamName(t.teamId).toLowerCase();
      case "skill":
        return (
          skills.find((x) => x.id === t.skills[0]?.skillId)?.name ?? ""
        ).toLowerCase();
      case "priority":
        return PRIORITY_ORDER[t.priority] ?? 0;
      case "assignee":
        return assigneeName(t);
      case "due":
        return t.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      case "scope":
        return SCOPE_ORDER[t.scopeSize] ?? 0;
    }
  }

  const designTasks = filtered.filter(isDesign);
  const otherTasks = filtered.filter((t) => !isDesign(t));
  const base = tab === "design" ? designTasks : otherTasks;
  const shown = useMemo(() => {
    if (!sort) return base;
    const arr = [...base].sort((a, b) => {
      const av = sortVal(a, sort.key);
      const bv = sortVal(b, sort.key);
      const c = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === "asc" ? c : -c;
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  function togglePriority(p: Priority) {
    setPriorityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

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
      scopeLocked: next !== "TODO" ? true : (before?.scopeLocked ?? false),
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
            scopeSize: created.scopeSize as ScopeSize,
            scopeLocked: created.estimateLocked,
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
                className={`rounded-full border px-2.5 py-0.5 text-xs uppercase tracking-wider transition-colors ${
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

        <div className="flex items-center gap-1">
          {PRIORITIES.map((p) => {
            const on = priorityFilter.has(p);
            return (
              <button
                key={p}
                onClick={() => togglePriority(p)}
                className={`rounded-full border px-2.5 py-0.5 text-xs uppercase tracking-wider transition-colors ${
                  on
                    ? "border-foreground/30 bg-foreground/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
                title="Filter by priority"
              >
                {p.toLowerCase()}
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

        <FilterSelect
          label="Skill"
          value={skillFilter}
          onChange={setSkillFilter}
          options={skills.map((s) => ({ value: s.id, label: s.name }))}
        />

        {tab === "other" ? (
          <FilterSelect
            label="Team"
            value={teamFilter}
            onChange={setTeamFilter}
            options={teams.map((t) => ({ value: t.id, label: t.name }))}
          />
        ) : null}

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
              "border-b border-border bg-muted/30 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground",
            )}
          >
            <SortHeader label="Status" col="status" sort={sort} onSort={toggleSort} />
            <SortHeader label="Item" col="title" sort={sort} onSort={toggleSort} />
            {tab === "other" ? (
              <SortHeader label="Team" col="team" sort={sort} onSort={toggleSort} />
            ) : null}
            <SortHeader label="Skills" col="skill" sort={sort} onSort={toggleSort} />
            <SortHeader
              label="Priority"
              col="priority"
              sort={sort}
              onSort={toggleSort}
            />
            <SortHeader
              label="Assignee"
              col="assignee"
              sort={sort}
              onSort={toggleSort}
            />
            <SortHeader label="Due" col="due" sort={sort} onSort={toggleSort} />
            <SortHeader
              label="Scope"
              col="scope"
              sort={sort}
              onSort={toggleSort}
              center
            />
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
                  xpConfig={xpConfig}
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

function SortHeader({
  label,
  col,
  sort,
  onSort,
  center,
}: {
  label: string;
  col: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" } | null;
  onSort: (key: SortKey) => void;
  center?: boolean;
}) {
  const active = sort?.key === col;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className={cn(
        "flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        center && "justify-center",
      )}
    >
      {label}
      {active ? (
        sort?.dir === "asc" ? (
          <ChevronUp className="size-3" />
        ) : (
          <ChevronDown className="size-3" />
        )
      ) : null}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        "h-7 rounded-md border bg-background px-2 text-xs",
        value
          ? "border-foreground/30 text-foreground"
          : "border-border text-muted-foreground",
      )}
      title={`Filter by ${label.toLowerCase()}`}
    >
      <option value="">{label}: all</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
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
  xpConfig,
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
  xpConfig: XpConfig;
  onChangeStatus: (id: string, next: Status) => void;
  onChangeAssignee: (id: string, userId: string | null) => void;
  onChangeTeam: (id: string, teamId: string | null) => void;
  onChangeSkills: (id: string, next: TaskSkill[]) => void;
  onCommitField: <K extends keyof Task>(id: string, key: K, value: Task[K]) => void;
  onDelete: (id: string) => void;
}) {
  const primary = task.assignees.find((a) => a.isPrimary) ?? task.assignees[0];

  // Live "≈ XP" hints: what each scope size is worth on-time, given this
  // task's skills + priority. Helps people scope honestly.
  const skillLevels = task.skills.map((s) => s.level);
  const xpHint = {
    S: `≈ ${xpForTaskClose({ skillLevels, scopeSize: "S", priority: task.priority }, xpConfig)}`,
    M: `≈ ${xpForTaskClose({ skillLevels, scopeSize: "M", priority: task.priority }, xpConfig)}`,
    L: `≈ ${xpForTaskClose({ skillLevels, scopeSize: "L", priority: task.priority }, xpConfig)}`,
    XL: `≈ ${xpForTaskClose({ skillLevels, scopeSize: "XL", priority: task.priority }, xpConfig)}`,
  };

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
                className="rounded px-1.5 py-0.5 text-xs"
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
      <ScopeSelect
        value={task.scopeSize}
        disabled={task.scopeLocked}
        hint={xpHint}
        onChange={(s) => onCommitField(task.id, "scopeSize", s)}
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
