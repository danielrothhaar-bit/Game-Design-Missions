"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { updateTaskDefaults } from "@/server/actions/config";

type Defaults = {
  autoDueDates: boolean;
  dueLeadUrgent: number;
  dueLeadHigh: number;
  dueLeadMedium: number;
  dueLeadLow: number;
};

const ROWS: { key: keyof Omit<Defaults, "autoDueDates">; label: string; color: string }[] =
  [
    { key: "dueLeadUrgent", label: "Urgent", color: "#ef4444" },
    { key: "dueLeadHigh", label: "High", color: "#f59e0b" },
    { key: "dueLeadMedium", label: "Medium", color: "#3b82f6" },
    { key: "dueLeadLow", label: "Low", color: "#71717a" },
  ];

export function TaskDefaultsAdmin({ initial }: { initial: Defaults }) {
  const [cfg, setCfg] = useState<Defaults>(initial);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      try {
        await updateTaskDefaults(cfg);
        toast.success("Task defaults saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3">
        <Checkbox
          checked={cfg.autoDueDates}
          onCheckedChange={(v) =>
            setCfg((c) => ({ ...c, autoDueDates: v === true }))
          }
          className="mt-0.5"
        />
        <span className="text-sm">
          Auto-set a due date on new tasks
          <span className="block text-xs text-muted-foreground">
            New tasks get a due date this many days out, based on priority. You
            can always change it on the task.
          </span>
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {ROWS.map((r) => (
          <div key={r.key} className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: r.color }}
              />
              {r.label} — days out
            </Label>
            <Input
              type="number"
              min={0}
              disabled={!cfg.autoDueDates}
              value={cfg[r.key]}
              onChange={(e) =>
                setCfg((c) => ({ ...c, [r.key]: Number(e.target.value) }))
              }
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save task defaults"}
        </Button>
      </div>
    </div>
  );
}
