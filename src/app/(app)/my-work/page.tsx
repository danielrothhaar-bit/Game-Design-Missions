import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { progressInLevel, titleForLevel } from "@/lib/xp";
import { getXpConfig } from "@/lib/config";
import { listSkills } from "@/lib/queries";
import {
  taskPriorityColor,
  taskStatusColor,
  taskStatusLabel,
} from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy } from "lucide-react";
import { SkillRadar } from "@/components/skill-radar";

export const metadata = { title: "My Work" };

export default async function MyWorkPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [me, assignments, streak, badges, proficiencyRows, allSkills] =
    await Promise.all([
      db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, userId) }),
      db.query.taskAssignees.findMany({
        where: (a, { eq }) => eq(a.userId, userId),
        with: {
          task: { with: { game: true, phase: true } },
        },
      }),
      db.query.streaks.findFirst({ where: (s, { eq }) => eq(s.userId, userId) }),
      db.query.userBadges.findMany({
        where: (b, { eq }) => eq(b.userId, userId),
        with: { badge: true },
      }),
      db.query.userSkills.findMany({
        where: (us, { eq }) => eq(us.userId, userId),
      }),
      listSkills(),
    ]);

  if (!me) redirect("/login");

  const skillNameById = new Map(allSkills.map((s) => [s.id, s.name]));
  const proficiency = proficiencyRows
    .filter((r) => r.level > 0)
    .map((r) => ({
      skill: skillNameById.get(r.skillId) ?? "?",
      level: r.level,
    }));
  const cfg = await getXpConfig();
  const p = progressInLevel(me.totalXp, cfg);

  const PRIORITY_RANK: Record<string, number> = {
    URGENT: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  const tasks = assignments
    .map((a) => a.task)
    .filter((t) => t.status !== "DONE")
    .sort((a, b) => {
      const pr = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
      if (pr !== 0) return pr;
      const ad = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const bd = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      return ad - bd;
    });

  // eslint-disable-next-line react-hooks/purity -- per-request timestamp in async RSC
  const now = Date.now();
  const overdue = tasks.filter(
    (t) => t.dueDate && t.dueDate.getTime() < now,
  ).length;
  const dueSoon = tasks.filter(
    (t) =>
      t.dueDate &&
      t.dueDate.getTime() >= now &&
      t.dueDate.getTime() < now + 1000 * 60 * 60 * 24 * 3,
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {(me.name ?? me.email).split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&rsquo;s what&rsquo;s on your plate.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open tasks" value={tasks.length} />
        <StatCard label="Overdue" value={overdue} accent="danger" />
        <StatCard label="Due in 3 days" value={dueSoon} accent="warn" />
        <StatCard
          label="Streak"
          value={streak?.current ?? 0}
          suffix="days"
          icon={<Flame className="size-4 text-red-400" />}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Progression</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {titleForLevel(p.level, cfg.titles)} · Level {p.level}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {me.totalXp.toLocaleString()} XP total
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={p.pct} className="h-2" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{p.intoLevel.toLocaleString()} XP this level</span>
            <span>{p.needed.toLocaleString()} XP needed</span>
          </div>
          {badges.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {badges.map(({ badge }) => (
                <Badge
                  key={badge.code}
                  variant="secondary"
                  className="gap-1.5"
                  style={{
                    borderColor: badge.color,
                    color: badge.color,
                  }}
                >
                  {badge.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL
                    <img
                      src={badge.imageUrl}
                      alt=""
                      className="size-3.5 rounded-sm object-cover"
                    />
                  ) : (
                    <Trophy className="size-3" />
                  )}
                  {badge.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {proficiency.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skill proficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <SkillRadar data={proficiency} height={240} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your open tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tasks.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Nothing assigned to you right now. Time to pick up a quest.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {tasks.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/games/${t.game.slug}`}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-accent/40"
                  >
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${taskStatusColor(t.status)}`}
                    >
                      {taskStatusLabel(t.status)}
                    </span>
                    <span
                      className={`w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wider ${taskPriorityColor(t.priority)}`}
                    >
                      {t.priority.toLowerCase()}
                    </span>
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.game.name}
                    </span>
                    {t.dueDate ? (
                      <span
                        className={`text-xs ${
                          t.dueDate.getTime() < now
                            ? "text-red-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {t.dueDate.toLocaleDateString()}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon,
  accent,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon?: React.ReactNode;
  accent?: "danger" | "warn";
}) {
  const accentClass =
    accent === "danger"
      ? "text-red-400"
      : accent === "warn"
        ? "text-amber-400"
        : "";
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          {icon} {label}
        </span>
        <span className={`text-2xl font-semibold ${accentClass}`}>
          {value}
          {suffix ? (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </span>
      </CardContent>
    </Card>
  );
}
