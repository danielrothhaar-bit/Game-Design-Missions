"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function InlineEditText({
  value,
  onCommit,
  className,
  placeholder,
}: {
  value: string;
  onCommit: (next: string) => void | Promise<void>;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  if (lastValue !== value) {
    setLastValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft.trim() && draft !== value) onCommit(draft.trim());
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        placeholder={placeholder}
        className={cn(
          "w-full bg-transparent outline-none ring-1 ring-ring rounded px-1.5 py-0.5",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "block w-full truncate text-left rounded px-1.5 py-0.5 hover:bg-accent/60",
        className,
      )}
    >
      {value || (
        <span className="text-muted-foreground/70 italic">{placeholder}</span>
      )}
    </button>
  );
}

export function InlineEditNumber({
  value,
  onCommit,
  min = 1,
  max = 100,
  disabled,
  className,
}: {
  value: number;
  onCommit: (next: number) => void | Promise<void>;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  if (lastValue !== value) {
    setLastValue(value);
    setDraft(String(value));
  }

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (disabled) {
    return (
      <span
        className={cn(
          "inline-flex h-6 items-center rounded px-1.5 text-xs text-muted-foreground",
          className,
        )}
        title="Locked once the task started"
      >
        {value}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const next = Number(draft);
          if (Number.isFinite(next) && next >= min && next <= max && next !== value) {
            onCommit(next);
          } else {
            setDraft(String(value));
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className={cn(
          "w-12 bg-transparent outline-none ring-1 ring-ring rounded px-1 py-0.5 text-xs text-center",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "inline-flex h-6 min-w-8 items-center justify-center rounded px-1.5 text-xs font-mono hover:bg-accent",
        className,
      )}
    >
      {value}
    </button>
  );
}
