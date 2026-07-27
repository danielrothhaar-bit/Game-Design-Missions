"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutGrid, LogOut, Plus } from "lucide-react";
import { logoutAction } from "@/server/actions/auth-actions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarLink, SidebarGameLink } from "./sidebar-link";
import { navItemsFor, isActivePath } from "./nav-items";
import { Logo } from "@/components/brand/logo";
import { type XpConfig } from "@/lib/xp";
import { cn } from "@/lib/utils";

type Game = {
  slug: string;
  name: string;
  coverColor: string;
  coverImage: string | null;
  statusSlug: string;
  division: string;
  isLead: boolean;
};

type StatusOption = { slug: string; label: string };
type DivisionOption = { slug: string; label: string; color: string };

export type SidebarProps = {
  games: Game[];
  statuses: StatusOption[];
  divisions: DivisionOption[];
  user: {
    name: string | null;
    email: string;
    totalXp: number;
    level: number;
    role: string;
  };
  xpConfig: XpConfig;
};

/** Desktop sidebar (hidden on mobile — the mobile nav reuses SidebarBody). */
export function Sidebar(props: SidebarProps) {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <SidebarBody {...props} />
    </aside>
  );
}

export function SidebarBody({
  games,
  statuses,
  divisions,
  user,
}: SidebarProps) {
  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4 md:hidden">
        <Link href="/my-work" className="flex items-center gap-2">
          <Logo size={28} />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-bold tracking-[0.06em] uppercase">
              Quests
            </span>
            <span className="text-xs italic text-muted-foreground">
              The Escape Game
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {/* App sections — only in the mobile drawer; on desktop these live in
            the top bar, so the sidebar stays a pure project browser. */}
        <MobileSectionNav isAdmin={isAdmin} />

        <ProjectsHeader />

        <div className="space-y-2">
          {divisions.map((div) => (
            <DivisionSection
              key={div.slug}
              label={div.label}
              slug={div.slug}
              color={div.color}
              statuses={statuses}
              games={games.filter((g) => g.division === div.slug)}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <SidebarLink href="/help" icon="help" label="Help" />
        <button
          onClick={() => logoutAction()}
          className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4 shrink-0 opacity-80" />
          Sign out
        </button>
      </div>
    </div>
  );
}

function MobileSectionNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = navItemsFor(isAdmin);
  return (
    <div className="mb-4 space-y-0.5 md:hidden">
      {items.map((it) => {
        const active = isActivePath(pathname, it);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/90 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0 opacity-80" />
            {it.label}
          </Link>
        );
      })}
      <div className="mt-3 border-t border-sidebar-border/70" />
    </div>
  );
}

function ProjectsHeader() {
  const pathname = usePathname();
  const active = pathname === "/games";
  return (
    <div className="flex items-center justify-between px-2.5 pb-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Projects
      </span>
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href="/games"
              aria-label="All projects"
              className={cn(
                "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" />
              All
            </Link>
          }
        />
        <TooltipContent>Browse all projects as a grid</TooltipContent>
      </Tooltip>
    </div>
  );
}

function DivisionSection({
  label,
  slug,
  color,
  statuses,
  games,
}: {
  label: string;
  slug: string;
  color: string;
  statuses: StatusOption[];
  games: Game[];
}) {
  const [open, setOpen] = useState(true);
  const knownSlugs = new Set(statuses.map((s) => s.slug));
  const grouped = [
    ...statuses.map((s) => ({
      label: s.label,
      games: games.filter((g) => g.statusSlug === s.slug),
    })),
    {
      label: "Other",
      games: games.filter((g) => !knownSlugs.has(g.statusSlug)),
    },
  ].filter((group) => group.games.length > 0);

  return (
    <div
      className="overflow-hidden rounded-lg border border-sidebar-border/60"
      // Tinted background in the division's own color so each stands apart.
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 12%, var(--sidebar))`,
        borderColor: `color-mix(in srgb, ${color} 35%, var(--sidebar-border))`,
      }}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left"
          aria-expanded={open}
        >
          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="truncate text-sm font-bold uppercase tracking-wide">
            {label}
          </span>
          <span className="ml-1 shrink-0 text-xs tabular-nums text-muted-foreground">
            {games.length}
          </span>
        </button>
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href={`/games/new?division=${slug}`}
                className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label={`New ${label} project`}
              >
                <Plus className="size-4" />
              </Link>
            }
          />
          <TooltipContent>New project</TooltipContent>
        </Tooltip>
      </div>
      {open ? (
        <div className="px-1.5 pb-1.5">
          {games.length === 0 ? (
            <p className="px-2 py-1 text-sm text-muted-foreground">
              No projects yet.
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
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={cn(
            "size-3.5 transition-transform",
            open && "rotate-90",
          )}
        />
        {label}
        <span className="ml-auto tabular-nums opacity-70">{games.length}</span>
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
                coverImage={g.coverImage}
                isLead={g.isLead}
              />
            ))}
        </div>
      ) : null}
    </div>
  );
}
