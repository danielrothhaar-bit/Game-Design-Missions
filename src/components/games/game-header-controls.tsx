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
import {
  GAME_STATUSES,
  gameStatusColor,
  gameStatusLabel,
} from "@/lib/format";
import { updateGame } from "@/server/actions/games";

type Status = (typeof GAME_STATUSES)[number];

export function GameStatusPicker({
  gameId,
  initial,
}: {
  gameId: string;
  initial: Status;
}) {
  const [status, setStatus] = useState<Status>(initial);
  const [pending, setPending] = useState(false);

  async function change(next: Status) {
    if (next === status) return;
    const before = status;
    setStatus(next);
    setPending(true);
    try {
      await updateGame({ id: gameId, status: next });
      toast.success(`Status changed to ${gameStatusLabel(next)}`);
    } catch {
      setStatus(before);
      toast.error("Could not update status");
    } finally {
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className={`inline-flex h-6 items-center rounded border px-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${gameStatusColor(status)}`}
      >
        {gameStatusLabel(status)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {GAME_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => change(s)}
            className="text-xs"
          >
            <span
              className={`inline-flex h-5 items-center rounded border px-1.5 text-[10px] font-medium uppercase tracking-wider ${gameStatusColor(s)}`}
            >
              {gameStatusLabel(s)}
            </span>
            {s === status ? <Check className="ml-auto size-3" /> : null}
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
