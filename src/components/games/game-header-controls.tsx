"use client";

import { useState } from "react";
import { CalendarDays, Check } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { updateGame } from "@/server/actions/games";
import { AssigneeSelect, type AssigneeUser } from "./assignee-select";

export type StatusOption = { slug: string; label: string; color: string };

export function GameLeadPicker({
  gameId,
  users,
  initialLeadId,
}: {
  gameId: string;
  users: AssigneeUser[];
  initialLeadId: string | null;
}) {
  const [leadId, setLeadId] = useState<string | null>(initialLeadId);

  async function change(next: string | null) {
    const before = leadId;
    setLeadId(next);
    try {
      await updateGame({ id: gameId, leadUserId: next });
      toast.success(next ? "Lead updated" : "Lead cleared");
    } catch {
      setLeadId(before);
      toast.error("Could not set lead");
    }
  }

  return (
    <span className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Lead:</span>
      <AssigneeSelect users={users} assignedId={leadId} onChange={change} />
    </span>
  );
}

function statusPillStyle(color: string) {
  return {
    backgroundColor: `${color}22`,
    color,
    borderColor: `${color}55`,
  } as const;
}

export function GameStatusPicker({
  gameId,
  initialSlug,
  statuses,
}: {
  gameId: string;
  initialSlug: string;
  statuses: StatusOption[];
}) {
  const [slug, setSlug] = useState<string>(initialSlug);
  const [pending, setPending] = useState(false);
  const current =
    statuses.find((s) => s.slug === slug) ??
    ({ slug, label: slug, color: "#71717a" } as StatusOption);

  async function change(next: StatusOption) {
    if (next.slug === slug) return;
    const before = slug;
    setSlug(next.slug);
    setPending(true);
    try {
      await updateGame({ id: gameId, statusSlug: next.slug });
      toast.success(`Status changed to ${next.label}`);
    } catch {
      setSlug(before);
      toast.error("Could not update status");
    } finally {
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="inline-flex h-6 items-center rounded border px-2 text-xs font-medium uppercase tracking-wider transition-colors"
        style={statusPillStyle(current.color)}
      >
        {current.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {statuses.map((s) => (
          <DropdownMenuItem
            key={s.slug}
            onClick={() => change(s)}
            className="text-xs"
          >
            <span
              className="inline-flex h-5 items-center rounded border px-1.5 text-xs font-medium uppercase tracking-wider"
              style={statusPillStyle(s.color)}
            >
              {s.label}
            </span>
            {s.slug === slug ? <Check className="ml-auto size-3" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function relativeLaunch(date: Date): string {
  const days = Math.round((date.getTime() - Date.now()) / 86400000);
  if (days === 0) return "Launches today";
  if (days > 0) return `Launches in ${days} day${days === 1 ? "" : "s"}`;
  const past = Math.abs(days);
  return `Launched ${past} day${past === 1 ? "" : "s"} ago`;
}

export function GameLaunchDatePicker({
  gameId,
  initial,
}: {
  gameId: string;
  initial: Date | null;
}) {
  const [value, setValue] = useState<Date | null>(initial);
  const [open, setOpen] = useState(false);

  async function change(next: Date | null) {
    const before = value;
    setValue(next);
    setOpen(false);
    try {
      await updateGame({ id: gameId, launchDate: next });
      toast.success(next ? "Launch date updated" : "Launch date cleared");
    } catch {
      setValue(before);
      toast.error("Could not update launch date");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent">
        <CalendarDays className="size-3.5" />
        {value ? relativeLaunch(value) : "Set launch date"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2 space-y-2">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(d) => change(d ?? null)}
          autoFocus
        />
        {value ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => change(null)}
          >
            Clear launch date
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
