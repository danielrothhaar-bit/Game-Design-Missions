"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateBadge } from "@/server/actions/config";

type Badge = {
  code: string;
  name: string;
  description: string;
  color: string;
  threshold: number | null;
  criteriaType: string;
};

export function BadgesAdmin({ initial }: { initial: Badge[] }) {
  const [badges, setBadges] = useState<Badge[]>(initial);
  const [pending, start] = useTransition();

  function patch(code: string, p: Partial<Badge>) {
    setBadges((prev) => prev.map((b) => (b.code === code ? { ...b, ...p } : b)));
  }

  function save(b: Badge) {
    start(async () => {
      try {
        await updateBadge({
          code: b.code,
          name: b.name,
          description: b.description,
          color: b.color,
          threshold: b.threshold ?? undefined,
        });
        toast.success(`Saved "${b.name}"`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save badge");
      }
    });
  }

  return (
    <div className="space-y-4">
      {badges.map((b) => (
        <div
          key={b.code}
          className="space-y-3 rounded-lg border border-border p-4"
        >
          <div className="flex items-center gap-3">
            <span
              className="size-8 shrink-0 rounded-md border"
              style={{ borderColor: b.color, backgroundColor: `${b.color}22` }}
            />
            <Input
              value={b.name}
              onChange={(e) => patch(b.code, { name: e.target.value })}
              className="flex-1 font-medium"
            />
            <input
              type="color"
              value={b.color}
              onChange={(e) => patch(b.code, { color: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
              aria-label={`${b.name} color`}
            />
          </div>
          <Textarea
            value={b.description}
            onChange={(e) => patch(b.code, { description: e.target.value })}
            rows={2}
            className="text-sm"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded bg-muted px-2 py-1 font-mono">
                {b.criteriaType}
              </span>
              <span>threshold</span>
              <Input
                type="number"
                value={b.threshold ?? 1}
                onChange={(e) =>
                  patch(b.code, { threshold: Number(e.target.value) })
                }
                className="h-8 w-24"
              />
            </div>
            <Button size="sm" onClick={() => save(b)} disabled={pending}>
              Save
            </Button>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Badges are awarded automatically when a member meets the threshold
        (checked after each task close). PLAYTEST_BUGS_CLOSED is reserved for a
        future playtest module.
      </p>
    </div>
  );
}
