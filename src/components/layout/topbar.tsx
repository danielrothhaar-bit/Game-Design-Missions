import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function Topbar({
  games,
  user,
}: {
  games: { name: string; slug: string }[];
  user: {
    name: string | null;
    email: string;
    image: string | null;
    level: number;
  };
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="ml-auto flex items-center gap-1.5">
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
