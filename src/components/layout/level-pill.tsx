import Link from "next/link";
import { Trophy } from "lucide-react";

/**
 * Compact, readable level indicator for the top bar. Single glanceable spot
 * for progression (the full breakdown lives on My Quests / Profile).
 */
export function LevelPill({
  level,
  title,
  pct,
}: {
  level: number;
  title: string;
  pct: number;
}) {
  return (
    <Link
      href="/profile"
      title={`Level ${level} · ${title} — ${pct}% to next level`}
      className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/60 py-1 pl-2 pr-3 transition-colors hover:bg-accent/40 sm:flex"
    >
      <Trophy className="size-4 shrink-0 text-amber-500 dark:text-amber-400" />
      <span className="flex flex-col leading-tight">
        <span className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold">Level {level}</span>
          <span className="hidden text-xs text-muted-foreground lg:inline">
            {title}
          </span>
        </span>
        <span
          className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-secondary"
          aria-hidden
        >
          <span
            className="block h-full rounded-full bg-amber-500 dark:bg-amber-400"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </span>
      </span>
    </Link>
  );
}
