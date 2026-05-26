import Link from "next/link";
import {
  BarChart3,
  Briefcase,
  LayoutGrid,
  Plus,
  Trophy,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarLink, SidebarGameLink } from "./sidebar-link";
import { progressInLevel, titleForLevel } from "@/lib/xp";

type Game = { slug: string; name: string; coverColor: string };

export function Sidebar({
  games,
  user,
}: {
  games: Game[];
  user: {
    name: string | null;
    email: string;
    totalXp: number;
    level: number;
  };
}) {
  const p = progressInLevel(user.totalXp);
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-4 py-4">
        <Link href="/my-work" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">
            Q
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Quests</span>
            <span className="text-[11px] text-muted-foreground">
              The Escape Game
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <div className="mb-3">
          <SidebarLink
            href="/my-work"
            icon={Briefcase}
            label="My Work"
            exact
          />
          <SidebarLink href="/dashboard" icon={BarChart3} label="Dashboard" />
          <SidebarLink href="/games" icon={LayoutGrid} label="All Games" exact />
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
          <div className="space-y-0.5">
            {games.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                No games yet.
              </p>
            ) : (
              games.map((g) => (
                <SidebarGameLink
                  key={g.slug}
                  slug={g.slug}
                  name={g.name}
                  color={g.coverColor}
                />
              ))
            )}
          </div>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/profile"
          className="block rounded-md px-2 py-2 hover:bg-sidebar-accent/60"
        >
          <div className="flex items-center gap-2 text-xs">
            <Trophy className="size-3.5 text-amber-400" />
            <span className="font-medium">Level {user.level}</span>
            <span className="text-muted-foreground">
              · {titleForLevel(user.level)}
            </span>
          </div>
          <Progress value={p.pct} className="mt-2 h-1.5" />
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {p.intoLevel.toLocaleString()} / {p.needed.toLocaleString()} XP to
            next level
          </p>
        </Link>
      </div>
    </aside>
  );
}
