"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { createGame } from "@/server/actions/games";

type StatusOption = { slug: string; label: string };
type Division = { slug: string; label: string };

const COLORS = [
  "#7c3aed",
  "#3b82f6",
  "#0d9488",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
];

export function NewGameForm({
  statuses,
  divisions,
  initialDivision,
}: {
  statuses: StatusOption[];
  divisions: Division[];
  initialDivision: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [statusSlug, setStatusSlug] = useState<string>(
    statuses[0]?.slug ?? "NEW",
  );
  const [division, setDivision] = useState(initialDivision);
  const [coverColor, setCoverColor] = useState(COLORS[0]);
  const [description, setDescription] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [fromTemplates, setFromTemplates] = useState(true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give the game a name.");
      return;
    }
    start(async () => {
      try {
        const res = await createGame({
          name: name.trim(),
          statusSlug,
          division,
          coverColor,
          description: description.trim() || undefined,
          launchDate: launchDate ? new Date(launchDate) : null,
          fromTemplates,
        });
        toast.success("Game created");
        router.push(`/games/${res.slug}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not create game");
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunken Citadel"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Division</Label>
            <div className="flex flex-wrap gap-2">
              {divisions.map((d) => (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => setDivision(d.slug)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    division === d.slug
                      ? "border-foreground/40 bg-foreground/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => setStatusSlug(s.slug)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    statusSlug === s.slug
                      ? "border-foreground/40 bg-foreground/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cover color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setCoverColor(c)}
                  className={`size-7 rounded-full border-2 transition-transform ${
                    coverColor === c
                      ? "scale-110 border-foreground"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="launch">Launch date (optional)</Label>
            <Input
              id="launch"
              type="date"
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One-line pitch for the game…"
              rows={3}
            />
          </div>

          <label className="flex items-start gap-3 rounded-md border border-border p-3">
            <Checkbox
              checked={fromTemplates}
              onCheckedChange={(v) => setFromTemplates(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm">
              Pre-build standard phases &amp; tasks
              <span className="block text-xs text-muted-foreground">
                Creates the 5 build phases with every default task assigned to
                its responsible team. Edit these defaults in Admin → Phase
                Tasks.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/games")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create game"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
