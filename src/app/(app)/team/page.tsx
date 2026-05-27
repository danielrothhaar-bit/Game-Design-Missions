import { redirect } from "next/navigation";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { getXpConfig } from "@/lib/config";
import { taskEffortWeight } from "@/lib/xp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TeamWorkloadChart,
  type WorkloadDatum,
} from "@/components/team-workload-chart";
import {
  TeamMemberWork,
  type TeamMember,
  type MemberTask,
} from "@/components/team-member-work";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team" };

const PRIORITY_RANK: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function byPriorityThenDue(a: MemberTask, b: MemberTask) {
  const pr = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
  if (pr !== 0) return pr;
  return (a.dueMs ?? Number.POSITIVE_INFINITY) - (b.dueMs ?? Number.POSITIVE_INFINITY);
}

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  const [users, assignments, dailyPlanRows, xpConfig] = await Promise.all([
    db.query.users.findMany({ orderBy: (u, { asc }) => [asc(u.name)] }),
    db.query.taskAssignees.findMany({
      with: {
        task: {
          with: {
            game: { columns: { name: true, slug: true } },
            skills: { columns: { level: true } },
          },
        },
      },
    }),
    db.query.dailyPlans.findMany({
      where: (dp, { eq }) => eq(dp.planDate, today),
    }),
    getXpConfig(),
  ]);

  // Sum estimate points on each user's open (not done) tasks, and collect the
  // open task list per user for the per-person viewer below.
  const points = new Map<string, number>();
  const taskCount = new Map<string, number>();
  const openByUser = new Map<string, MemberTask[]>();
  for (const a of assignments) {
    const t = a.task;
    if (!t || t.status === "DONE") continue;
    const weight = taskEffortWeight(
      t.skills.map((s) => s.level),
      t.scopeSize,
      xpConfig,
    );
    points.set(a.userId, (points.get(a.userId) ?? 0) + weight);
    taskCount.set(a.userId, (taskCount.get(a.userId) ?? 0) + 1);
    const arr = openByUser.get(a.userId) ?? [];
    arr.push({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueMs: t.dueDate ? t.dueDate.getTime() : null,
      gameName: t.game.name,
      gameSlug: t.game.slug,
    });
    openByUser.set(a.userId, arr);
  }

  const planByUser = new Map<string, Set<string>>();
  for (const dp of dailyPlanRows) {
    const s = planByUser.get(dp.userId) ?? new Set<string>();
    s.add(dp.taskId);
    planByUser.set(dp.userId, s);
  }

  const data: WorkloadDatum[] = users
    .map((u) => ({
      name: u.name ?? u.email.split("@")[0],
      points: Math.round(points.get(u.id) ?? 0),
      tasks: taskCount.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points);

  const totalPoints = data.reduce((s, d) => s + d.points, 0);
  const active = data.filter((d) => d.points > 0).length;
  const avg = active > 0 ? Math.round(totalPoints / active) : 0;

  // Per-person work viewer: people with open work first, then the rest.
  const members: TeamMember[] = users
    .map((u) => {
      const open = (openByUser.get(u.id) ?? []).sort(byPriorityThenDue);
      const planSet = planByUser.get(u.id) ?? new Set<string>();
      return {
        id: u.id,
        name: u.name ?? u.email.split("@")[0],
        open,
        today: open.filter((t) => planSet.has(t.id)),
      };
    })
    .sort((a, b) => b.open.length - a.open.length || a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Current workload by estimate points across all open, assigned tasks.
        </p>
      </header>

      {/* Condensed overview: inline stats + chart and breakdown side by side */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
          <InlineStat label="Open points (total)" value={totalPoints} />
          <InlineStat label="People with work" value={active} />
          <InlineStat label="Avg points / person" value={avg} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Workload by person</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamWorkloadChart data={data} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {data.map((d) => (
                <li
                  key={d.name}
                  className="flex items-center justify-between px-6 py-2 text-sm"
                >
                  <span>{d.name}</span>
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{d.points}</strong> pts ·{" "}
                    {d.tasks} task{d.tasks === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Per-person work viewer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Each person&rsquo;s work</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick a teammate to see their Today and Open tasks.
          </p>
        </CardHeader>
        <CardContent>
          <TeamMemberWork members={members} />
        </CardContent>
      </Card>
    </div>
  );
}

function InlineStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-2xl font-semibold">{value}</span>
    </div>
  );
}
