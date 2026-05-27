import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGameBySlug,
  listGameStatuses,
  listUsers,
} from "@/lib/queries";
import { SIDEQUEST_STATUSES } from "@/lib/format";
import {
  GameLaunchDatePicker,
  GameLeadPicker,
  GameStatusPicker,
} from "@/components/games/game-header-controls";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [game, users, statuses] = await Promise.all([
    getGameBySlug(slug),
    listUsers(),
    listGameStatuses(),
  ]);
  if (!game) notFound();

  const isSidequest = game.kind === "SIDEQUEST";
  const statusOptions = isSidequest
    ? SIDEQUEST_STATUSES
    : statuses.map((s) => ({ slug: s.slug, label: s.label, color: s.color }));

  return (
    <div className="flex h-full flex-col">
      <div
        className="h-1 w-full shrink-0"
        style={{ backgroundColor: game.coverColor }}
      />
      <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-lg font-semibold">{game.name}</h1>
          {isSidequest ? (
            <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sky-300">
              Sidequest
            </span>
          ) : null}
          <GameStatusPicker
            gameId={game.id}
            initialSlug={game.statusSlug ?? game.status}
            statuses={statusOptions}
          />
          {isSidequest ? null : (
            <GameLaunchDatePicker
              gameId={game.id}
              initial={game.launchDate ?? null}
            />
          )}
          <GameLeadPicker
            gameId={game.id}
            initialLeadId={game.leadUserId ?? null}
            users={users.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              image: u.image,
            }))}
          />
        </div>
        <nav className="flex items-center gap-1 text-sm">
          <TabLink href={`/games/${slug}`} label="List" exact />
          <TabLink href={`/games/${slug}/board`} label="Board" disabled />
          <TabLink href={`/games/${slug}/timeline`} label="Timeline" disabled />
        </nav>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function TabLink({
  href,
  label,
  exact,
  disabled,
}: {
  href: string;
  label: string;
  exact?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-md px-3 py-1.5 text-muted-foreground/60">
        {label}
        <span className="ml-1.5 text-[10px] uppercase tracking-wider">
          soon
        </span>
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-foreground hover:bg-accent"
      aria-current={exact ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
