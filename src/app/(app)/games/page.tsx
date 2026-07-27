import Link from "next/link";
import { Plus } from "lucide-react";
import { listAllGames, listGameStatuses, listDivisions } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { GamesManager } from "@/components/games/games-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Games" };

export default async function GamesIndexPage() {
  const [games, statuses, divisions] = await Promise.all([
    listAllGames(),
    listGameStatuses(),
    listDivisions(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Games</h1>
          <p className="text-sm text-muted-foreground">
            Manage every project — set status, upload an icon, archive or
            delete.
          </p>
        </div>
        <Button render={<Link href="/games/new" />}>
          <Plus className="size-4" />
          New project
        </Button>
      </header>

      <GamesManager
        divisions={divisions.map((d) => ({
          slug: d.slug,
          label: d.label,
          color: d.color,
        }))}
        statuses={statuses.map((s) => ({ slug: s.slug, label: s.label }))}
        games={games.map((g) => ({
          id: g.id,
          slug: g.slug,
          name: g.name,
          division: g.division,
          coverColor: g.coverColor,
          coverImage: g.coverImage,
          statusSlug: g.statusSlug ?? g.status,
          archived: g.archivedAt !== null,
        }))}
      />
    </div>
  );
}
