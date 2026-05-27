"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSkill, deleteSkill, updateSkill } from "@/server/actions/skills";

type Skill = { id: string; name: string; color: string; archived: boolean };

export function SkillsAdmin({ initialSkills }: { initialSkills: Skill[] }) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#a855f7");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, start] = useTransition();

  function add() {
    const name = newName.trim();
    if (!name) return;
    start(async () => {
      try {
        await createSkill({ name, color: newColor });
        // optimistic: append a placeholder; server revalidate refreshes ids
        setSkills((prev) => [
          ...prev,
          { id: `tmp-${Date.now()}`, name, color: newColor, archived: false },
        ]);
        setNewName("");
        toast.success(`Added "${name}"`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not add skill");
      }
    });
  }

  function save(id: string, patch: Partial<Skill>) {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
    start(async () => {
      try {
        await updateSkill({ id, ...patch });
      } catch {
        toast.error("Could not save skill");
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this skill? Tasks using it keep their history.")) return;
    const before = skills;
    setSkills((prev) => prev.filter((s) => s.id !== id));
    start(async () => {
      try {
        await deleteSkill(id);
        toast.success("Skill deleted");
      } catch {
        setSkills(before);
        toast.error("Could not delete skill");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">
            New skill
          </label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Laser Cutting"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
          aria-label="Skill color"
        />
        <Button onClick={add}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {skills.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No skills yet.
          </li>
        ) : (
          skills.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {editingId === s.id ? (
                <Input
                  autoFocus
                  defaultValue={s.name}
                  className="h-8"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== s.name) save(s.id, { name: v });
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <span className="flex-1 text-sm">{s.name}</span>
              )}
              <input
                type="color"
                value={s.color}
                onChange={(e) => save(s.id, { color: e.target.value })}
                className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent"
                aria-label={`${s.name} color`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setEditingId(editingId === s.id ? null : s.id)}
              >
                {editingId === s.id ? (
                  <X className="size-4" />
                ) : (
                  <Pencil className="size-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => remove(s.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))
        )}
      </ul>
      <p className="text-xs text-muted-foreground">
        Skills appear in the task skill picker. Deleting a skill removes it from
        the picker; tasks that used it keep their recorded history.
      </p>
    </div>
  );
}
