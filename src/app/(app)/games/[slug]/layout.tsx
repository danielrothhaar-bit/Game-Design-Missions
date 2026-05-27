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
import { GameTabs } from "@/components/games/game-tabs";

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
        <GameTabs slug={slug} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
