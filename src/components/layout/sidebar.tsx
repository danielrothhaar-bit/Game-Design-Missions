"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, LogOut, Plus, Trophy } from "lucide-react";
import { signOut } from "next-auth/react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarLink, SidebarGameLink } from "./sidebar-link";
import { progressInLevel, titleForLevel, type XpConfig } from "@/lib/xp";
import { cn } from "@/lib/utils";

type Game = {
  slug: string;
  name: string;
  coverColor: string;
  statusSlug: string;
  isLead: boolean;
};

type StatusOption = { slug: string; label: string };
type Sidequest = {
  slug: string;
  name: string;
  coverColor: string;
  statusSlug: string;
};

export function Sidebar({
  games,
  statuses,
  sidequests,
  user,
  xpConfig,
}: {
  games: Game[];
  statuses: StatusOption[];
  sidequests: Sidequest[];
  user: {
    name: string | null;
    email: string;
    totalXp: number;
    level: number;
    role: string;
  };
  xpConfig: XpConfig;
}) {
  const p = progressInLevel(user.totalXp, xpConfig);
  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";

  const knownSlugs = new Set(statuses.map((s) => s.slug));
  const grouped = [
    ...statuses.map((s) => ({
      label: s.label,
      games: games.filter((g) => g.statusSlug === s.slug),
    })),
    // Any games whose status isn't a known option (legacy/edge) go last.
    {
      label: "Other",
      games: games.filter((g) => !knownSlugs.has(g.statusSlug)),
    },
  ].filter((group) => group.games.length > 0);

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-4 py-4">
        <Link href="/my-work" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">
            M
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Missions</span>
            <span className="text-[11px] text-muted-foreground">
              The Escape Game
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <div className="mb-3">
          <SidebarLink href="/my-work" icon="briefcase" label="My Work" exact />
          <SidebarLink href="/dashboard" icon="dashboard" label="Dashboard" />
          <SidebarLink href="/games" icon="grid" label="All Games" exact />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between px-2.5 pb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Games
            </span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/games/new"
                    className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    aria-label="New game"
                  >
                    <Plus className="size-3.5" />
                  </Link>
                }
              />
              <TooltipContent>New game</TooltipContent>
            </Tooltip>
          </div>

          {games.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">
              No games yet.
            </p>
          ) : (
            <div className="space-y-1">
              {grouped.map((group) => (
                <GameGroup
                  key={group.label}
                  label={group.label}
                  games={group.games}
                />
              ))}
            </div>
          )}
        </div>

        <SidequestSection sidequests={sidequests} />

        {isAdmin ? (
          <div className="mt-4">
            <SidebarLink href="/admin" icon="shield" label="Admin" />
          </div>
        ) : null}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/profile"
          className="block rounded-md px-2 py-2 hover:bg-sidebar-accent/60"
        >
          <div className="flex items-center gap-2 text-xs">
            <Trophy className="size-3.5 text-amber-400" />
            <span className="font-medium">Level {p.level}</span>
            <span className="text-muted-foreground">
              · {titleForLevel(p.level, xpConfig.titles)}
            </span>
          </div>
          <Progress value={p.pct} className="mt-2 h-1.5" />
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {p.intoLevel.toLocaleString()} / {p.needed.toLocaleString()} XP to
            next level
          </p>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4 shrink-0 opacity-80" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function SidequestSection({ sidequests }: { sidequests: Sidequest[] }) {
  const [showClosed, setShowClosed] = useState(false);
  const open = sidequests.filter((s) => s.statusSlug !== "CLOSED");
  const closed = sidequests.filter((s) => s.statusSlug === "CLOSED");
  const visible = showClosed ? sidequests : open;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-2.5 pb-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Sidequests
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/sidequests/new"
                className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="New sidequest"
              >
                <Plus className="size-3.5" />
              </Link>
            }
          />
          <TooltipContent>New sidequest</TooltipContent>
        </Tooltip>
      </div>

      {visible.length === 0 ? (
        <p className="px-2.5 py-1 text-xs text-muted-foreground">
          No sidequests.
        </p>
      ) : (
        <div className="space-y-0.5 pl-1.5">
          {visible.map((s) => (
            <SidebarGameLink
              key={s.slug}
              slug={s.slug}
              name={s.name}
              color={s.coverColor}
            />
          ))}
        </div>
      )}

      {closed.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowClosed((v) => !v)}
          className="mt-1 px-2.5 text-[11px] text-muted-foreground hover:text-foreground"
        >
          {showClosed ? "Hide" : "Show"} closed quests ({closed.length})
        </button>
      ) : null}
    </div>
  );
}

function GameGroup({
  label,
  games,
}: {
  label: string;
  games: Game[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={cn(
            "size-3 transition-transform",
            open && "rotate-90",
          )}
        />
        {label}
        <span className="ml-auto tabular-nums opacity-60">{games.length}</span>
      </button>
      {open ? (
        <div className="space-y-0.5 pb-1 pl-1.5">
          {[...games]
            .sort((a, b) => Number(b.isLead) - Number(a.isLead))
            .map((g) => (
              <SidebarGameLink
                key={g.slug}
                slug={g.slug}
                name={g.name}
                color={g.coverColor}
                isLead={g.isLead}
              />
            ))}
        </div>
      ) : null}
    </div>
  );
}
