import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { effectiveUserId } from "@/lib/impersonation";
import { progressInLevel, titleForLevel } from "@/lib/xp";
import { getXpConfig } from "@/lib/config";
import { listGames, listGameStatuses } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Ban, Flame, Trophy } from "lucide-react";
import { GameShield } from "@/components/games/game-shield";
import { MyWorkTabs } from "@/components/my-work-tabs";

export const metadata = { title: "My Quests" };

const DAY = 1000 * 60 * 60 * 24;

export default async function MyWorkPage() {
  const userId = await effectiveUserId();
  if (!userId) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  const [
    me,
    assignments,
    streak,
    badges,
    unassignedRows,
    dailyPlanRows,
    gamesList,
    statuses,
  ] = await Promise.all([
      db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, userId) }),
      db.query.taskAssignees.findMany({
        where: (a, { eq }) => eq(a.userId, userId),
        with: {
          task: {
            with: {
              game: true,
              skills: { with: { skill: true } },
            },
          },
        },
      }),
      db.query.streaks.findFirst({ where: (s, { eq }) => eq(s.userId, userId) }),
      db.query.userBadges.findMany({
        where: (b, { eq }) => eq(b.userId, userId),
        with: { badge: true },
      }),
      db.query.tasks.findMany({
        where: (t, { ne }) => ne(t.status, "DONE"),
        with: {
          assignees: { columns: { userId: true } },
          game: { columns: { name: true, slug: true } },
        },
      }),
      db.query.dailyPlans.findMany({
        where: (dp, { eq, and }) =>
          and(eq(dp.userId, userId), eq(dp.planDate, today)),
      }),
      listGames(),
      listGameStatuses(),
    ]);

  if (!me) redirect("/login");

  const planSet = new Set(dailyPlanRows.map((d) => d.taskId));
  const projectOptions = [...gamesList]
    .map((g) => ({ id: g.id, name: g.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

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
      t.dueDate.getTime() < now + DAY * 3,
  ).length;

  // ── Games this user leads ───────────────────────────────────
  const statusBy = new Map(statuses.map((s) => [s.slug, s]));
  const leadGames = gamesList.filter((g) => g.leadUserId === userId);
  const leadGameIds = leadGames.map((g) => g.id);
  const leadTasks = leadGameIds.length
    ? await db.query.tasks.findMany({
        where: (t, { inArray }) => inArray(t.gameId, leadGameIds),
        columns: { gameId: true, status: true, dueDate: true },
      })
    : [];
  const tasksByGame = new Map<string, typeof leadTasks>();
  for (const t of leadTasks) {
    const arr = tasksByGame.get(t.gameId) ?? [];
    arr.push(t);
    tasksByGame.set(t.gameId, arr);
  }
  const leadSummaries = leadGames.map((g) => {
    const ts = tasksByGame.get(g.id) ?? [];
    const total = ts.length;
    const done = ts.filter((t) => t.status === "DONE").length;
    const blocked = ts.filter((t) => t.status === "BLOCKED").length;
    const overdueCount = ts.filter(
      (t) => t.status !== "DONE" && t.dueDate && t.dueDate.getTime() < now,
    ).length;
    const status = statusBy.get(g.statusSlug ?? g.status);
    const daysToLaunch = g.launchDate
      ? Math.round((g.launchDate.getTime() - now) / DAY)
      : null;
    return {
      id: g.id,
      slug: g.slug,
      name: g.name,
      coverColor: g.coverColor,
      coverImage: g.coverImage,
      statusLabel: status?.label ?? g.statusSlug ?? g.status,
      statusColor: status?.color ?? "#6b7280",
      total,
      done,
      blocked,
      overdue: overdueCount,
      pct: total === 0 ? 0 : Math.round((done / total) * 100),
      daysToLaunch,
    };
  });

  // ── Tab data ────────────────────────────────────────────────
  const openData = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueMs: t.dueDate ? t.dueDate.getTime() : null,
    gameName: t.game.name,
    gameSlug: t.game.slug,
    doToday: planSet.has(t.id),
  }));

  const doneTasks = assignments
    .map((a) => a.task)
    .filter((t) => t.status === "DONE");

  const projMap = new Map<
    string,
    {
      gameName: string;
      gameSlug: string;
      tasks: { id: string; title: string; completedAt: string; ms: number }[];
    }
  >();
  for (const t of doneTasks) {
    const ms = t.completedAt?.getTime() ?? t.updatedAt.getTime();
    const entry = projMap.get(t.gameId) ?? {
      gameName: t.game.name,
      gameSlug: t.game.slug,
      tasks: [],
    };
    entry.tasks.push({
      id: t.id,
      title: t.title,
      completedAt: new Date(ms).toISOString(),
      ms,
    });
    projMap.set(t.gameId, entry);
  }
  const completedProjects = [...projMap.values()]
    .map((p) => ({
      gameName: p.gameName,
      gameSlug: p.gameSlug,
      tasks: p.tasks
        .sort((a, b) => b.ms - a.ms)
        .map(({ id, title, completedAt }) => ({ id, title, completedAt })),
      latest: Math.max(...p.tasks.map((t) => t.ms)),
    }))
    .sort((a, b) => b.latest - a.latest)
    .map(({ gameName, gameSlug, tasks: ts }) => ({
      gameName,
      gameSlug,
      tasks: ts,
    }));

  const LEVELS = [
    { key: "BEGINNER", label: "Beginner", color: "#22c55e" },
    { key: "INTERMEDIATE", label: "Intermediate", color: "#eab308" },
    { key: "ADVANCED", label: "Advanced", color: "#ef4444" },
    { key: "EXPERT", label: "Expert", color: "#a855f7" },
  ];
  const summaryMap = new Map<
    string,
    { skill: string; color: string; counts: Record<string, number> }
  >();
  for (const t of doneTasks) {
    for (const ts of t.skills) {
      if (!ts.skill) continue;
      const entry = summaryMap.get(ts.skill.id) ?? {
        skill: ts.skill.name,
        color: ts.skill.color,
        counts: {},
      };
      entry.counts[ts.level] = (entry.counts[ts.level] ?? 0) + 1;
      summaryMap.set(ts.skill.id, entry);
    }
  }
  const summaryData = [...summaryMap.values()]
    .map((s) => {
      const levels = LEVELS.map((l) => ({
        label: l.label,
        color: l.color,
        count: s.counts[l.key] ?? 0,
      }));
      return {
        skill: s.skill,
        color: s.color,
        levels,
        total: levels.reduce((sum, l) => sum + l.count, 0),
      };
    })
    .sort((a, b) => b.total - a.total);

  const unassignedData = unassignedRows
    .filter((t) => t.assignees.length === 0)
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      gameName: t.game.name,
      gameSlug: t.game.slug,
    }))
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9),
    );

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

      {leadSummaries.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Projects you lead
            </h2>
            <p className="text-sm text-muted-foreground">
              Where each of your projects stands right now.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {leadSummaries.map((g) => (
              <LeadGameCard key={g.id} g={g} />
            ))}
          </div>
        </section>
      ) : null}

      <MyWorkTabs
        open={openData}
        completed={completedProjects}
        summary={summaryData}
        unassigned={unassignedData}
        projects={projectOptions}
      />
    </div>
  );
}

type LeadSummary = {
  slug: string;
  name: string;
  coverColor: string;
  coverImage: string | null;
  statusLabel: string;
  statusColor: string;
  total: number;
  done: number;
  blocked: number;
  overdue: number;
  pct: number;
  daysToLaunch: number | null;
};

function LeadGameCard({ g }: { g: LeadSummary }) {
  return (
    <Link href={`/games/${g.slug}`} className="group block">
      <Card className="relative overflow-hidden transition-colors hover:border-foreground/25">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: g.coverColor }}
        />
        <CardContent className="space-y-3 p-4 pl-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <GameShield slug={g.slug} coverImage={g.coverImage} size={36} />
              <h3 className="truncate text-base font-bold leading-tight">
                {g.name}
              </h3>
            </div>
            <span
              className="shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: `${g.statusColor}22`,
                color: g.statusColor,
                borderColor: `${g.statusColor}55`,
              }}
            >
              {g.statusLabel}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {g.done} / {g.total} tasks done
              </span>
              <span className="font-bold tabular-nums">{g.pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full"
                style={{ width: `${g.pct}%`, backgroundColor: g.coverColor }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            {g.daysToLaunch !== null ? (
              <span className="text-muted-foreground">
                {g.daysToLaunch >= 0
                  ? `Launches in ${g.daysToLaunch}d`
                  : `Launched ${-g.daysToLaunch}d ago`}
              </span>
            ) : null}
            {g.blocked > 0 ? (
              <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                <Ban className="size-3.5" />
                {g.blocked} blocked
              </span>
            ) : null}
            {g.overdue > 0 ? (
              <span className="flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
                <AlertTriangle className="size-3.5" />
                {g.overdue} overdue
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
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
