import Link from "next/link";
import { listGames } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { gameStatusLabel } from "@/lib/format";

export const metadata = { title: "All Games" };

export default async function GamesIndexPage() {
  const games = await listGames();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Games</h1>
          <p className="text-sm text-muted-foreground">
            Every escape room your studio is shaping.
          </p>
        </div>
      </header>

      {games.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No games yet. Spin up your first one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => (
            <Link key={g.id} href={`/games/${g.slug}`}>
              <Card className="overflow-hidden transition-colors hover:border-foreground/20">
                <div
                  className="h-20"
                  style={{
                    background: `linear-gradient(135deg, ${g.coverColor}, ${g.coverColor}66)`,
                  }}
                />
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{g.name}</h3>
                    <Badge variant="secondary" className="shrink-0">
                      {gameStatusLabel(g.status)}
                    </Badge>
                  </div>
                  {g.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {g.description}
                    </p>
                  ) : null}
                  {g.launchDate ? (
                    <p className="text-xs text-muted-foreground">
                      Launch · {g.launchDate.toLocaleDateString()}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
