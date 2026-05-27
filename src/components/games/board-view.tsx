"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateTaskFields } from "@/server/actions/tasks";
import {
  STATUSES,
  type Status,
  type Priority,
} from "./status-select";
import {
  initials,
  taskPriorityColor,
  taskStatusColor,
  taskStatusLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export type BoardTask = {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  dueMs: number | null;
  teamId: string | null;
  assignee: { name: string | null; email: string; image: string | null } | null;
  team: { name: string; color: string } | null;
  skillCount: number;
};

export function BoardView({
  initialTasks,
  gameDesignTeamId,
}: {
  initialTasks: BoardTask[];
  gameDesignTeamId: string | null;
}) {
  const [tasks, setTasks] = useState<BoardTask[]>(initialTasks);
  const [tab, setTab] = useState<"design" | "other">("design");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const isDesign = (t: BoardTask) =>
    t.teamId === null || t.teamId === gameDesignTeamId;

  const visible = useMemo(
    () => tasks.filter((t) => (tab === "design" ? isDesign(t) : !isDesign(t))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, tab, gameDesignTeamId],
  );

  const designCount = tasks.filter(isDesign).length;
  const otherCount = tasks.length - designCount;

  async function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const next = overId as Status;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === next) return;

    const before = task.status;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: next } : t)),
    );
    try {
      await updateTaskFields({ id, status: next });
      if (next === "DONE") toast.success("Task closed — XP awarded.");
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: before } : t)),
      );
      toast.error(err instanceof Error ? err.message : "Could not move task");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border bg-background px-6">
        <TabButton
          active={tab === "design"}
          onClick={() => setTab("design")}
          label="Game Design"
          count={designCount}
        />
        <TabButton
          active={tab === "other"}
          onClick={() => setTab("other")}
          label="Other Teams"
          count={otherCount}
        />
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex flex-1 gap-3 overflow-x-auto p-4">
          {STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={visible.filter((t) => t.status === status)}
              showTeam={tab === "other"}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({
  status,
  tasks,
  showTeam,
}: {
  status: Status;
  tasks: BoardTask[];
  showTeam: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span
          className={`inline-flex h-5 items-center rounded border px-1.5 text-[10px] font-medium uppercase tracking-wider ${taskStatusColor(status)}`}
        >
          {taskStatusLabel(status)}
        </span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-2 transition-colors",
          isOver && "border-foreground/30 bg-accent/40",
        )}
      >
        {tasks.map((t) => (
          <Card key={t.id} task={t} showTeam={showTeam} />
        ))}
      </div>
    </div>
  );
}

function Card({ task, showTeam }: { task: BoardTask; showTeam: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  // eslint-disable-next-line react-hooks/purity -- overdue check at render
  const nowMs = Date.now();
  const overdue =
    task.dueMs !== null && task.status !== "DONE" && task.dueMs < nowMs;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
          : undefined
      }
      className={cn(
        "cursor-grab touch-none space-y-2 rounded-md border border-border bg-card p-2.5 shadow-sm active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <p className="text-sm leading-snug">{task.title}</p>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span
          className={`font-semibold uppercase tracking-wider ${taskPriorityColor(task.priority)}`}
        >
          {task.priority.toLowerCase()}
        </span>
        {showTeam && task.team ? (
          <span
            className="rounded px-1 py-0.5"
            style={{
              backgroundColor: `${task.team.color}22`,
              color: task.team.color,
            }}
          >
            {task.team.name}
          </span>
        ) : null}
        {task.skillCount > 0 ? <span>· {task.skillCount} skill</span> : null}
        {task.dueMs !== null ? (
          <span className={overdue ? "text-red-400" : ""}>
            · {new Date(task.dueMs).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        ) : null}
        {task.assignee ? (
          <Avatar className="ml-auto size-5">
            {task.assignee.image ? (
              <AvatarImage src={task.assignee.image} alt="" />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-[8px]">
              {initials(task.assignee.name ?? task.assignee.email)}
            </AvatarFallback>
          </Avatar>
        ) : null}
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
