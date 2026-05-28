import Link from "next/link";
import { listGames, listGameStatuses } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { GameShield } from "@/components/games/game-shield";

export const metadata = { title: "All Games" };

export default async function GamesIndexPage() {
  const [games, statuses] = await Promise.all([
    listGames(),
    listGameStatuses(),
  ]);
  const statusBy = new Map(statuses.map((s) => [s.slug, s]));
  const statusFor = (g: { statusSlug: string | null; status: string }) =>
    statusBy.get(g.statusSlug ?? g.status);

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
                  className="relative flex h-24 items-center justify-center overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${g.coverColor}, ${g.coverColor}66)`,
                  }}
                >
                  <GameShield slug={g.slug} size={88} />
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{g.name}</h3>
                    {(() => {
                      const s = statusFor(g);
                      return (
                        <span
                          className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                          style={
                            s
                              ? {
                                  backgroundColor: `${s.color}22`,
                                  color: s.color,
                                  borderColor: `${s.color}55`,
                                }
                              : undefined
                          }
                        >
                          {s?.label ?? g.statusSlug ?? g.status}
                        </span>
                      );
                    })()}
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
