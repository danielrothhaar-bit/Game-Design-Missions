"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, SquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InlineEditText } from "@/components/games/inline-edit-text";
import {
  SkillSelect,
  TeamSelect,
  type SkillOption,
  type TaskSkill,
  type TeamOption,
} from "@/components/games/task-meta-selects";
import {
  addPhaseTemplate,
  addPhaseTemplateTask,
  createTaskFromTemplateTask,
  createTasksFromTemplate,
  deletePhaseTemplate,
  deletePhaseTemplateTask,
  setPhaseTemplateTaskSkills,
  updatePhaseTemplate,
  updatePhaseTemplateTask,
} from "@/server/actions/phase-templates";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const SCOPES = ["S", "M", "L", "XL"] as const;

let tmpCounter = 0;

type GameOption = { id: string; name: string };
type TemplateTask = {
  id: string;
  title: string;
  teamId: string | null;
  priority: string;
  scopeSize: string;
  skills: TaskSkill[];
};
type Phase = {
  id: string;
  name: string;
  color: string;
  tasks: TemplateTask[];
};

/** A pending "create into a game" request awaiting a game selection. */
type PickerReq = {
  label: string;
  run: (gameId: string) => Promise<{ count?: number; slug?: string }>;
};

export function TaskTemplatesAdmin({
  initialPhases,
  teams,
  skills,
  games,
}: {
  initialPhases: Phase[];
  teams: TeamOption[];
  skills: SkillOption[];
  games: GameOption[];
}) {
  const [phases, setPhases] = useState<Phase[]>(initialPhases);
  const [, start] = useTransition();
  const [newSection, setNewSection] = useState("");
  const [picker, setPicker] = useState<PickerReq | null>(null);

  function mutate(phaseId: string, fn: (tasks: TemplateTask[]) => TemplateTask[]) {
    setPhases((prev) =>
      prev.map((p) => (p.id === phaseId ? { ...p, tasks: fn(p.tasks) } : p)),
    );
  }

  // ── task-row ops ──────────────────────────────────────────
  function add(phaseId: string, title: string) {
    if (!title.trim()) return;
    const tmpId = `tmp-${tmpCounter++}`;
    mutate(phaseId, (t) => [
      ...t,
      {
        id: tmpId,
        title: title.trim(),
        teamId: null,
        priority: "MEDIUM",
        scopeSize: "M",
        skills: [],
      },
    ]);
    start(async () => {
      try {
        const { id } = await addPhaseTemplateTask({
          phaseTemplateId: phaseId,
          title: title.trim(),
        });
        mutate(phaseId, (t) =>
          t.map((x) => (x.id === tmpId ? { ...x, id } : x)),
        );
      } catch {
        toast.error("Could not add task");
      }
    });
  }

  function patchTask(
    phaseId: string,
    id: string,
    patch: Partial<TemplateTask>,
    run: () => Promise<unknown>,
    errMsg: string,
  ) {
    mutate(phaseId, (t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    start(async () => {
      try {
        await run();
      } catch {
        toast.error(errMsg);
      }
    });
  }

  function remove(phaseId: string, id: string) {
    mutate(phaseId, (t) => t.filter((x) => x.id !== id));
    start(async () => {
      try {
        await deletePhaseTemplateTask(id);
      } catch {
        toast.error("Could not delete task");
      }
    });
  }

  // ── section ops ───────────────────────────────────────────
  function addSection(name: string) {
    if (!name.trim()) return;
    const tmpId = `tmp-sec-${tmpCounter++}`;
    const color = "#64748b";
    setPhases((prev) => [
      ...prev,
      { id: tmpId, name: name.trim(), color, tasks: [] },
    ]);
    setNewSection("");
    start(async () => {
      try {
        const { id } = await addPhaseTemplate({ name: name.trim(), color });
        setPhases((prev) =>
          prev.map((p) => (p.id === tmpId ? { ...p, id } : p)),
        );
      } catch {
        toast.error("Could not add section");
      }
    });
  }

  function patchSection(id: string, patch: Partial<Phase>) {
    setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    start(async () => {
      try {
        await updatePhaseTemplate({ id, ...patch });
      } catch {
        toast.error("Could not update section");
      }
    });
  }

  function removeSection(id: string) {
    setPhases((prev) => prev.filter((p) => p.id !== id));
    start(async () => {
      try {
        await deletePhaseTemplate(id);
      } catch {
        toast.error("Could not delete section");
      }
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Reusable task lists, grouped into sections. Every new project starts
        with these. You can also drop a whole section — or a single task — into
        an existing project with <strong>Create tasks</strong>. Skills, team,
        priority and scope all carry over.
      </p>

      {phases.map((p) => (
        <PhaseBlock
          key={p.id}
          phase={p}
          teams={teams}
          skills={skills}
          hasGames={games.length > 0}
          onAdd={(title) => add(p.id, title)}
          onRenameTask={(id, title) =>
            patchTask(p.id, id, { title }, () =>
              updatePhaseTemplateTask({ id, title }), "Could not rename task")
          }
          onSetTeam={(id, teamId) =>
            patchTask(p.id, id, { teamId }, () =>
              updatePhaseTemplateTask({ id, teamId }), "Could not change team")
          }
          onSetPriority={(id, priority) =>
            patchTask(p.id, id, { priority }, () =>
              updatePhaseTemplateTask({
                id,
                priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
              }), "Could not change priority")
          }
          onSetScope={(id, scopeSize) =>
            patchTask(p.id, id, { scopeSize }, () =>
              updatePhaseTemplateTask({
                id,
                scopeSize: scopeSize as "S" | "M" | "L" | "XL",
              }), "Could not change scope")
          }
          onSetSkills={(id, next) =>
            patchTask(p.id, id, { skills: next }, () =>
              setPhaseTemplateTaskSkills(id, next), "Could not change skills")
          }
          onRemoveTask={(id) => remove(p.id, id)}
          onRenameSection={(name) => patchSection(p.id, { name })}
          onColorSection={(color) => patchSection(p.id, { color })}
          onDeleteSection={() => removeSection(p.id)}
          onCreateAll={() =>
            setPicker({
              label: `Add all ${p.tasks.length} “${p.name}” tasks to…`,
              run: (gameId) => createTasksFromTemplate(gameId, p.id),
            })
          }
          onCreateOne={(id, title) =>
            setPicker({
              label: `Add “${title}” to…`,
              run: (gameId) => createTaskFromTemplateTask(gameId, id),
            })
          }
        />
      ))}

      {/* Add a section */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addSection(newSection);
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
          placeholder="New section name…"
          className="h-9 max-w-xs"
        />
        <Button type="submit" variant="secondary" disabled={!newSection.trim()}>
          <SquarePlus className="size-4" />
          Add section
        </Button>
      </form>

      <GamePickerDialog
        req={picker}
        games={games}
        onClose={() => setPicker(null)}
      />
    </div>
  );
}

function PhaseBlock({
  phase,
  teams,
  skills,
  hasGames,
  onAdd,
  onRenameTask,
  onSetTeam,
  onSetPriority,
  onSetScope,
  onSetSkills,
  onRemoveTask,
  onRenameSection,
  onColorSection,
  onDeleteSection,
  onCreateAll,
  onCreateOne,
}: {
  phase: Phase;
  teams: TeamOption[];
  skills: SkillOption[];
  hasGames: boolean;
  onAdd: (title: string) => void;
  onRenameTask: (id: string, title: string) => void;
  onSetTeam: (id: string, teamId: string | null) => void;
  onSetPriority: (id: string, priority: string) => void;
  onSetScope: (id: string, scopeSize: string) => void;
  onSetSkills: (id: string, next: TaskSkill[]) => void;
  onRemoveTask: (id: string) => void;
  onRenameSection: (name: string) => void;
  onColorSection: (color: string) => void;
  onDeleteSection: () => void;
  onCreateAll: () => void;
  onCreateOne: (id: string, title: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState(phase.color);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          onBlur={() => color !== phase.color && onColorSection(color)}
          className="size-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label="Section color"
          title="Section color"
        />
        <InlineEditText
          value={phase.name}
          onCommit={onRenameSection}
          className="text-sm font-semibold"
        />
        <span className="text-xs text-muted-foreground">
          {phase.tasks.length}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant="secondary"
            disabled={!hasGames || phase.tasks.length === 0}
            title={hasGames ? "Add these tasks to a project" : "No projects yet"}
            onClick={onCreateAll}
          >
            <Plus className="size-3.5" />
            Create tasks
          </Button>
          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              title="Delete section"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete “{phase.name}”?</DialogTitle>
                <DialogDescription>
                  This removes the section and its {phase.tasks.length} template
                  task{phase.tasks.length === 1 ? "" : "s"}. Projects already
                  created keep their tasks.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline">Cancel</Button>} />
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDeleteSection();
                    setConfirmDelete(false);
                  }}
                >
                  Delete section
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {phase.tasks.map((t) => (
          <li
            key={t.id}
            className="grid grid-cols-[1fr_150px_120px_84px_36px_36px] items-center gap-2 px-3 py-1.5"
          >
            <InlineEditText
              value={t.title}
              onCommit={(v) => onRenameTask(t.id, v)}
              className="text-sm"
            />
            <TeamSelect
              teams={teams}
              value={t.teamId}
              onChange={(id) => onSetTeam(t.id, id)}
            />
            <SkillSelect
              skills={skills}
              value={t.skills}
              onChange={(next) => onSetSkills(t.id, next)}
            />
            <select
              value={t.priority}
              onChange={(e) => onSetPriority(t.id, e.target.value)}
              className="h-7 rounded border border-border bg-input px-1 text-xs"
              aria-label="Priority"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <select
              value={t.scopeSize}
              onChange={(e) => onSetScope(t.id, e.target.value)}
              className="h-7 rounded border border-border bg-input px-1 text-xs"
              aria-label="Scope"
            >
              {SCOPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                disabled={!hasGames}
                title={hasGames ? "Add this task to a project" : "No projects yet"}
                onClick={() => onCreateOne(t.id, t.title)}
              >
                <Plus className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                title="Delete"
                onClick={() => onRemoveTask(t.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(draft);
          setDraft("");
        }}
        className="flex items-center gap-2 border-t border-border/60 px-3 py-2"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a template task…"
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={!draft.trim()}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </form>
    </div>
  );
}

function GamePickerDialog({
  req,
  games,
  onClose,
}: {
  req: PickerReq | null;
  games: GameOption[];
  onClose: () => void;
}) {
  const [gameId, setGameId] = useState<string>("");
  const [pending, start] = useTransition();

  const open = req !== null;
  const selected = gameId || games[0]?.id || "";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setGameId("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create tasks</DialogTitle>
          <DialogDescription>{req?.label}</DialogDescription>
        </DialogHeader>
        <select
          value={selected}
          onChange={(e) => setGameId(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-input px-2 text-sm"
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            disabled={pending || !selected || !req}
            onClick={() => {
              if (!req || !selected) return;
              start(async () => {
                try {
                  const res = await req.run(selected);
                  const n = res?.count;
                  toast.success(
                    n !== undefined
                      ? `Added ${n} task${n === 1 ? "" : "s"}`
                      : "Task added",
                  );
                  onClose();
                  setGameId("");
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Could not create tasks",
                  );
                }
              });
            }}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Add to project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
