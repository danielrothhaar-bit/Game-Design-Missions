"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createDivision,
  deleteDivision,
  moveDivision,
  updateDivision,
} from "@/server/actions/divisions";

type Division = { slug: string; label: string; color: string };

export function DivisionsAdmin({ initial }: { initial: Division[] }) {
  const [divisions, setDivisions] = useState<Division[]>(initial);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#7c3aed");
  const [, start] = useTransition();

  function add() {
    const label = newLabel.trim();
    if (!label) return;
    start(async () => {
      try {
        await createDivision({ label, color: newColor });
        setDivisions((prev) => [
          ...prev,
          { slug: label.toUpperCase().replace(/[^A-Z0-9]+/g, "_"), label, color: newColor },
        ]);
        setNewLabel("");
        toast.success(`Added "${label}"`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not add division");
      }
    });
  }

  function save(slug: string, patch: Partial<Division>) {
    setDivisions((prev) =>
      prev.map((d) => (d.slug === slug ? { ...d, ...patch } : d)),
    );
    start(async () => {
      try {
        await updateDivision({ slug, ...patch });
      } catch {
        toast.error("Could not save division");
      }
    });
  }

  function remove(slug: string) {
    if (!confirm("Delete this division?")) return;
    const before = divisions;
    setDivisions((prev) => prev.filter((d) => d.slug !== slug));
    start(async () => {
      try {
        await deleteDivision(slug);
        toast.success("Division deleted");
      } catch (e) {
        setDivisions(before);
        toast.error(e instanceof Error ? e.message : "Could not delete");
      }
    });
  }

  function move(slug: string, dir: "up" | "down") {
    const idx = divisions.findIndex((d) => d.slug === slug);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= divisions.length) return;
    const next = [...divisions];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setDivisions(next);
    start(async () => {
      try {
        await moveDivision(slug, dir);
      } catch {
        toast.error("Could not reorder");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">
            New division
          </label>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Retail"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
          aria-label="Division color"
        />
        <Button onClick={add}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {divisions.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No divisions.
          </li>
        ) : (
          divisions.map((d, i) => (
            <li key={d.slug} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <Input
                defaultValue={d.label}
                className="h-8 flex-1"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== d.label) save(d.slug, { label: v });
                }}
              />
              <input
                type="color"
                value={d.color}
                onChange={(e) => save(d.slug, { color: e.target.value })}
                className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent"
                aria-label={`${d.label} color`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={i === 0}
                onClick={() => move(d.slug, "up")}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={i === divisions.length - 1}
                onClick={() => move(d.slug, "down")}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => remove(d.slug)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))
        )}
      </ul>
      <p className="text-xs text-muted-foreground">
        Divisions are the top-level sidebar sections. A division with projects
        can&rsquo;t be deleted until those projects are moved.
      </p>
    </div>
  );
}
