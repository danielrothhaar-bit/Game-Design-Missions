"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createGameStatus,
  deleteGameStatus,
  moveGameStatus,
  updateGameStatus,
} from "@/server/actions/game-statuses";

type Status = { slug: string; label: string; color: string };

export function GameStatusesAdmin({ initial }: { initial: Status[] }) {
  const [statuses, setStatuses] = useState<Status[]>(initial);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [, start] = useTransition();

  function add() {
    const label = newLabel.trim();
    if (!label) return;
    start(async () => {
      try {
        await createGameStatus({ label, color: newColor });
        setStatuses((prev) => [
          ...prev,
          { slug: label.toUpperCase().replace(/[^A-Z0-9]+/g, "_"), label, color: newColor },
        ]);
        setNewLabel("");
        toast.success(`Added "${label}"`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not add status");
      }
    });
  }

  function save(slug: string, patch: Partial<Status>) {
    setStatuses((prev) =>
      prev.map((s) => (s.slug === slug ? { ...s, ...patch } : s)),
    );
    start(async () => {
      try {
        await updateGameStatus({ slug, ...patch });
      } catch {
        toast.error("Could not save status");
      }
    });
  }

  function remove(slug: string) {
    if (!confirm("Delete this status?")) return;
    const before = statuses;
    setStatuses((prev) => prev.filter((s) => s.slug !== slug));
    start(async () => {
      try {
        await deleteGameStatus(slug);
        toast.success("Status deleted");
      } catch (e) {
        setStatuses(before);
        toast.error(e instanceof Error ? e.message : "Could not delete");
      }
    });
  }

  function move(slug: string, dir: "up" | "down") {
    const idx = statuses.findIndex((s) => s.slug === slug);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= statuses.length) return;
    const next = [...statuses];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setStatuses(next);
    start(async () => {
      try {
        await moveGameStatus(slug, dir);
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
            New status
          </label>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. On Hold"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
          aria-label="Status color"
        />
        <Button onClick={add}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {statuses.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No statuses.
          </li>
        ) : (
          statuses.map((s, i) => (
            <li key={s.slug} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wider"
                style={{
                  backgroundColor: `${s.color}22`,
                  color: s.color,
                  borderColor: `${s.color}55`,
                }}
              >
                {s.label}
              </span>
              <Input
                defaultValue={s.label}
                className="h-8 flex-1"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== s.label) save(s.slug, { label: v });
                }}
              />
              <input
                type="color"
                value={s.color}
                onChange={(e) => save(s.slug, { color: e.target.value })}
                className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent"
                aria-label={`${s.label} color`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={i === 0}
                onClick={() => move(s.slug, "up")}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={i === statuses.length - 1}
                onClick={() => move(s.slug, "down")}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => remove(s.slug)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))
        )}
      </ul>
      <p className="text-xs text-muted-foreground">
        Statuses group games in the sidebar (in this order) and appear in the
        game header + New Game form. A status in use by a game can&rsquo;t be
        deleted until those games are reassigned.
      </p>
    </div>
  );
}
