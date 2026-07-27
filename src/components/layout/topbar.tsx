import Link from "next/link";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { TopbarNav } from "./topbar-nav";
import { LevelPill } from "./level-pill";
import { LogoLockup } from "@/components/brand/logo";

export function Topbar({
  games,
  user,
  isAdmin,
  mobileNav,
}: {
  games: { name: string; slug: string }[];
  user: {
    name: string | null;
    email: string;
    image: string | null;
    level: number;
    title: string;
    levelPct: number;
  };
  isAdmin: boolean;
  mobileNav?: React.ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
      {mobileNav}
      <Link href="/my-work" className="flex items-center pl-1 pr-2">
        <LogoLockup size={26} />
      </Link>
      <TopbarNav isAdmin={isAdmin} />
      <div className="ml-auto flex items-center gap-2">
        <LevelPill
          level={user.level}
          title={user.title}
          pct={user.levelPct}
        />
        <CommandPalette games={games} />
        <ThemeToggle />
        <UserMenu
          name={user.name}
          email={user.email}
          image={user.image}
          level={user.level}
        />
      </div>
    </header>
  );
}
