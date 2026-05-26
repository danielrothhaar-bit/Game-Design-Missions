import { redirect } from "next/navigation";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import {
  progressInLevel,
  titleForLevel,
  xpForLevel,
} from "@/lib/xp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, disciplineLabel } from "@/lib/format";
import { Flame, Trophy } from "lucide-react";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [me, streak, userBadges, disciplineXp, recentXp] = await Promise.all([
    db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, userId) }),
    db.query.streaks.findFirst({ where: (s, { eq }) => eq(s.userId, userId) }),
    db.query.userBadges.findMany({
      where: (b, { eq }) => eq(b.userId, userId),
      with: { badge: true },
    }),
    db.query.disciplineXp.findMany({
      where: (d, { eq }) => eq(d.userId, userId),
    }),
    db.query.xpEvents.findMany({
      where: (e, { eq }) => eq(e.userId, userId),
      orderBy: (e, { desc }) => [desc(e.createdAt)],
      limit: 10,
    }),
  ]);
  if (!me) redirect("/login");

  const p = progressInLevel(me.totalXp);
  const sortedDiscipline = [...disciplineXp].sort((a, b) => b.xp - a.xp);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Card>
        <CardContent className="flex items-center gap-5 p-6">
          <Avatar className="size-16">
            {me.image ? <AvatarImage src={me.image} alt={me.name ?? ""} /> : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {initials(me.name ?? me.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {me.name ?? me.email}
            </h1>
            <p className="text-sm text-muted-foreground">
              {titleForLevel(me.level)} · Level {me.level} ·{" "}
              {disciplineLabel(me.primaryDiscipline)}
            </p>
            <div className="mt-3">
              <Progress value={p.pct} className="h-2" />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{me.totalXp.toLocaleString()} XP</span>
                <span>
                  Next: {xpForLevel(me.level).toLocaleString()} XP
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex items-center gap-1.5">
              <Flame className="size-4 text-red-400" />
              <span className="font-medium">{streak?.current ?? 0}</span>
              <span className="text-muted-foreground">day streak</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Longest: {streak?.longest ?? 0} days
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Badges</CardTitle>
          </CardHeader>
          <CardContent>
            {userBadges.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No badges yet. Close tasks and build a streak to start earning.
              </p>
            ) : (
              <ul className="space-y-3">
                {userBadges.map(({ badge, awardedAt }) => (
                  <li key={badge.code} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 grid size-8 place-items-center rounded-md border"
                      style={{
                        borderColor: badge.color,
                        color: badge.color,
                      }}
                    >
                      <Trophy className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium leading-tight">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {badge.description}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Awarded {awardedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Discipline mastery</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedDiscipline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Each discipline you contribute to levels up independently.
              </p>
            ) : (
              <ul className="space-y-3">
                {sortedDiscipline.map((d) => {
                  const total = sortedDiscipline[0].xp || 1;
                  return (
                    <li key={d.discipline}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{disciplineLabel(d.discipline)}</span>
                        <span className="text-muted-foreground">
                          {d.xp.toLocaleString()} XP
                        </span>
                      </div>
                      <Progress
                        value={Math.round((d.xp / total) * 100)}
                        className="h-1.5"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent XP</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentXp.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              Nothing yet — close a task to earn your first XP.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentXp.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm">
                      {e.reason.replace(/_/g, " ").toLowerCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-emerald-400">
                    +{e.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
