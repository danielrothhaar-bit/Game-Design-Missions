import Link from "next/link";
import { GameShield } from "@/components/games/game-shield";
import { readableOn, darken } from "@/lib/color";
import { cn } from "@/lib/utils";

export type GameCounts = {
  overdue: number;
  dueSoon: number;
  future: number;
};

/**
 * The project "module" used on My Quests and the Portfolio. A large circular
 * logo on a card filled with the game's own color, plus a breakdown of open
 * work by urgency. Flashes red when anything is overdue.
 */
export function GameModule({
  slug,
  name,
  coverColor,
  coverImage,
  counts,
  statusLabel,
  daysToLaunch,
}: {
  slug: string;
  name: string;
  coverColor: string;
  coverImage: string | null;
  counts: GameCounts;
  statusLabel?: string;
  daysToLaunch?: number | null;
}) {
  const fg = readableOn(coverColor);
  const onDark = fg === "#ffffff";
  const chipBg = onDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.10)";
  const flashing = counts.overdue > 0;
  const launchesIn =
    daysToLaunch !== null && daysToLaunch !== undefined && daysToLaunch >= 0
      ? daysToLaunch
      : null;

  return (
    <Link
      href={`/games/${slug}`}
      className={cn(
        "group block rounded-[1.75rem] outline-none",
        flashing && "animate-flash-red",
      )}
    >
      <div
        className="relative flex items-center gap-4 overflow-hidden rounded-[1.75rem] p-3 pr-5 transition-transform group-hover:-translate-y-0.5"
        style={{
          background: `linear-gradient(135deg, ${coverColor}, ${darken(coverColor, 0.28)})`,
          color: fg,
        }}
      >
        {/* Circular logo */}
        <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-white/90 shadow-inner ring-1 ring-black/10">
          <GameShield
            slug={slug}
            coverImage={coverImage}
            size={64}
            className="rounded-full"
          />
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold leading-tight">{name}</h3>
            {statusLabel ? (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: chipBg }}
              >
                {statusLabel}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <CountChip
              label="Overdue"
              n={counts.overdue}
              tone={counts.overdue > 0 ? "danger" : "muted"}
              chipBg={chipBg}
            />
            <CountChip
              label="Due soon"
              n={counts.dueSoon}
              tone="muted"
              chipBg={chipBg}
            />
            <CountChip
              label="Upcoming"
              n={counts.future}
              tone="muted"
              chipBg={chipBg}
            />
          </div>

          {launchesIn !== null ? (
            <p className="text-xs opacity-80">
              Launches in {launchesIn}d
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function CountChip({
  label,
  n,
  tone,
  chipBg,
}: {
  label: string;
  n: number;
  tone: "danger" | "muted";
  chipBg: string;
}) {
  const danger = tone === "danger";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={
        danger
          ? { backgroundColor: "#dc2626", color: "#fff" }
          : { backgroundColor: chipBg }
      }
    >
      <span className="text-sm font-bold tabular-nums">{n}</span>
      {label}
    </span>
  );
}
