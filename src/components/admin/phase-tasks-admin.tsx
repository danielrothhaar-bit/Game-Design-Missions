"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineEditText } from "@/components/games/inline-edit-text";
import { TeamSelect, type TeamOption } from "@/components/games/task-meta-selects";
import {
  addPhaseTemplateTask,
  deletePhaseTemplateTask,
  updatePhaseTemplateTask,
} from "@/server/actions/phase-templates";

let tmpCounter = 0;

type TemplateTask = { id: string; title: string; teamId: string | null };
type Phase = {
  id: string;
  name: string;
  color: string;
  tasks: TemplateTask[];
};

export function PhaseTasksAdmin({
  initialPhases,
  teams,
}: {
  initialPhases: Phase[];
  teams: TeamOption[];
}) {
  const [phases, setPhases] = useState<Phase[]>(initialPhases);
  const [, start] = useTransition();

  function mutate(phaseId: string, fn: (tasks: TemplateTask[]) => TemplateTask[]) {
    setPhases((prev) =>
      prev.map((p) => (p.id === phaseId ? { ...p, tasks: fn(p.tasks) } : p)),
    );
  }

  function add(phaseId: string, title: string) {
    if (!title.trim()) return;
    const tmpId = `tmp-${tmpCounter++}`;
    mutate(phaseId, (t) => [...t, { id: tmpId, title: title.trim(), teamId: null }]);
    start(async () => {
      try {
        await addPhaseTemplateTask({ phaseTemplateId: phaseId, title: title.trim() });
      } catch {
        toast.error("Could not add task");
      }
    });
  }

  function rename(phaseId: string, id: string, title: string) {
    mutate(phaseId, (t) => t.map((x) => (x.id === id ? { ...x, title } : x)));
    start(async () => {
      try {
        await updatePhaseTemplateTask({ id, title });
      } catch {
        toast.error("Could not rename task");
      }
    });
  }

  function setTeam(phaseId: string, id: string, teamId: string | null) {
    mutate(phaseId, (t) => t.map((x) => (x.id === id ? { ...x, teamId } : x)));
    start(async () => {
      try {
        await updatePhaseTemplateTask({ id, teamId });
      } catch {
        toast.error("Could not change team");
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

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        These default tasks are created for every new game, grouped by phase
        and assigned to the responsible team. Edits here only affect{" "}
        <em>future</em> games.
      </p>
      {phases.map((p) => (
        <PhaseBlock
          key={p.id}
          phase={p}
          teams={teams}
          onAdd={(title) => add(p.id, title)}
          onRename={(id, title) => rename(p.id, id, title)}
          onSetTeam={(id, teamId) => setTeam(p.id, id, teamId)}
          onRemove={(id) => remove(p.id, id)}
        />
      ))}
    </div>
  );
}

function PhaseBlock({
  phase,
  teams,
  onAdd,
  onRename,
  onSetTeam,
  onRemove,
}: {
  phase: Phase;
  teams: TeamOption[];
  onAdd: (title: string) => void;
  onRename: (id: string, title: string) => void;
  onSetTeam: (id: string, teamId: string | null) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: phase.color }}
        />
        <h3 className="text-sm font-medium">{phase.name}</h3>
        <span className="text-xs text-muted-foreground">
          {phase.tasks.length}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {phase.tasks.map((t) => (
          <li
            key={t.id}
            className="grid grid-cols-[1fr_160px_32px] items-center gap-3 px-4 py-1.5"
          >
            <InlineEditText
              value={t.title}
              onCommit={(v) => onRename(t.id, v)}
              className="text-sm"
            />
            <TeamSelect
              teams={teams}
              value={t.teamId}
              onChange={(id) => onSetTeam(t.id, id)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(t.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(draft);
          setDraft("");
        }}
        className="flex items-center gap-2 border-t border-border/60 px-4 py-2"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a default task…"
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
