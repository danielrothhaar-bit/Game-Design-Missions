"use client";

import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DueDatePopover({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (next: Date | null) => void;
}) {
  // eslint-disable-next-line react-hooks/purity -- read once per render to color overdue state
  const now = Date.now();
  const overdue = value && value.getTime() < now;
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-6 items-center gap-1 rounded px-1.5 text-xs hover:bg-accent",
          value
            ? overdue
              ? "text-red-400"
              : "text-foreground"
            : "text-muted-foreground",
        )}
      >
        <CalendarDays className="size-3.5" />
        {value ? formatDate(value) : "Set due"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2 space-y-2">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(d) => onChange(d ?? null)}
          autoFocus
        />
        {value ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onChange(null)}
          >
            Clear due date
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
