"use client";

import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { taskStatusColor, taskStatusLabel } from "@/lib/format";

export const STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE",
] as const;
export type Status = (typeof STATUSES)[number];

export function StatusPill({
  status,
  onChange,
}: {
  status: Status;
  onChange: (next: Status) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex h-6 items-center rounded border px-2 text-xs font-medium uppercase tracking-wider transition-colors ${taskStatusColor(status)}`}
      >
        {taskStatusLabel(status)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onChange(s)}
            className="text-xs"
          >
            <span
              className={`inline-flex h-5 items-center rounded border px-1.5 text-xs font-medium uppercase tracking-wider ${taskStatusColor(s)}`}
            >
              {taskStatusLabel(s)}
            </span>
            {s === status ? <Check className="ml-auto size-3" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export function PrioritySelect({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (next: Priority) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-6 items-center gap-1 rounded px-1.5 text-xs hover:bg-accent">
        <PriorityFlag p={value} />
        <span className="text-muted-foreground capitalize">
          {value.toLowerCase()}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {PRIORITIES.map((p) => (
          <DropdownMenuItem
            key={p}
            onClick={() => onChange(p)}
            className="text-xs gap-2"
          >
            <PriorityFlag p={p} />
            <span className="capitalize">{p.toLowerCase()}</span>
            {p === value ? <Check className="ml-auto size-3" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const SCOPE_SIZES = ["S", "M", "L", "XL"] as const;
export type ScopeSize = (typeof SCOPE_SIZES)[number];
const SCOPE_LABELS: Record<ScopeSize, string> = {
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "Massive",
};

export function ScopeSelect({
  value,
  disabled,
  hint,
  onChange,
}: {
  value: ScopeSize;
  disabled?: boolean;
  /** Optional per-size labels, e.g. "≈ 40 XP", shown in the menu. */
  hint?: Partial<Record<ScopeSize, string>>;
  onChange: (next: ScopeSize) => void;
}) {
  if (disabled) {
    return (
      <span
        className="inline-flex h-6 items-center justify-center rounded px-1.5 text-xs font-medium text-muted-foreground"
        title="Scope is locked once work starts"
      >
        {value}
      </span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-6 items-center justify-center gap-1 rounded px-1.5 text-xs font-medium hover:bg-accent">
        {value}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-44">
        {SCOPE_SIZES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onChange(s)}
            className="gap-2 text-xs"
          >
            <span className="w-7 font-medium">{s}</span>
            <span className="text-muted-foreground">{SCOPE_LABELS[s]}</span>
            {hint?.[s] ? (
              <span className="ml-auto text-xs text-muted-foreground">
                {hint[s]}
              </span>
            ) : s === value ? (
              <Check className="ml-auto size-3" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PriorityFlag({ p }: { p: Priority }) {
  const color =
    p === "URGENT"
      ? "text-red-400"
      : p === "HIGH"
        ? "text-amber-400"
        : p === "MEDIUM"
          ? "text-blue-400"
          : "text-zinc-500";
  return (
    <svg viewBox="0 0 16 16" className={`size-3.5 ${color}`} aria-hidden>
      <path
        d="M4 2v12M4 3h7l-2 3 2 3H4"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
