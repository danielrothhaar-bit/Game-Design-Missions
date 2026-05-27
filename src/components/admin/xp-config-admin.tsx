"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateXpConfig } from "@/server/actions/config";
import { xpForLevel, type XpConfig } from "@/lib/xp";

export function XpConfigAdmin({ initial }: { initial: XpConfig }) {
  const [cfg, setCfg] = useState<XpConfig>(initial);
  const [pending, start] = useTransition();

  function num<K extends keyof XpConfig>(key: K, value: string) {
    const n = Number(value);
    setCfg((c) => ({ ...c, [key]: Number.isFinite(n) ? n : 0 }));
  }

  function save() {
    const titles = [...cfg.titles].sort((a, b) => a.from - b.from);
    start(async () => {
      try {
        await updateXpConfig({ ...cfg, titles });
        toast.success("XP settings saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="XP per estimate point">
          <Input
            type="number"
            value={cfg.xpPerPoint}
            onChange={(e) => num("xpPerPoint", e.target.value)}
          />
        </Field>
        <Field label="Level base XP (curve)">
          <Input
            type="number"
            value={cfg.levelBaseXp}
            onChange={(e) => num("levelBaseXp", e.target.value)}
          />
        </Field>
        <Field label="On-time multiplier %">
          <Input
            type="number"
            value={cfg.onTimeMult}
            onChange={(e) => num("onTimeMult", e.target.value)}
          />
        </Field>
        <Field label="Early multiplier %">
          <Input
            type="number"
            value={cfg.earlyMult}
            onChange={(e) => num("earlyMult", e.target.value)}
          />
        </Field>
        <Field label="Late multiplier %">
          <Input
            type="number"
            value={cfg.lateMult}
            onChange={(e) => num("lateMult", e.target.value)}
          />
        </Field>
        <Field label="Reviewer assist %">
          <Input
            type="number"
            value={cfg.assistPct}
            onChange={(e) => num("assistPct", e.target.value)}
          />
        </Field>
        <Field label="Reopen reversal window (days)">
          <Input
            type="number"
            value={cfg.reopenReversalDays}
            onChange={(e) => num("reopenReversalDays", e.target.value)}
          />
        </Field>
      </div>

      <div>
        <Label className="mb-2 block">Level titles</Label>
        <div className="space-y-2">
          {cfg.titles.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Level</span>
              <Input
                type="number"
                value={t.from}
                className="w-20"
                onChange={(e) =>
                  setCfg((c) => ({
                    ...c,
                    titles: c.titles.map((x, j) =>
                      j === i ? { ...x, from: Number(e.target.value) } : x,
                    ),
                  }))
                }
              />
              <span className="text-xs text-muted-foreground">+</span>
              <Input
                value={t.title}
                className="flex-1"
                onChange={(e) =>
                  setCfg((c) => ({
                    ...c,
                    titles: c.titles.map((x, j) =>
                      j === i ? { ...x, title: e.target.value } : x,
                    ),
                  }))
                }
              />
              <span className="w-24 text-right text-[11px] text-muted-foreground">
                {xpForLevel(t.from, cfg).toLocaleString()} XP
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() =>
                  setCfg((c) => ({
                    ...c,
                    titles: c.titles.filter((_, j) => j !== i),
                  }))
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() =>
            setCfg((c) => ({
              ...c,
              titles: [
                ...c.titles,
                {
                  from:
                    (c.titles[c.titles.length - 1]?.from ?? 0) + 5,
                  title: "New Title",
                },
              ],
            }))
          }
        >
          <Plus className="size-4" />
          Add title
        </Button>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save XP settings"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
