import { redirect } from "next/navigation";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TeamWorkloadChart,
  type WorkloadDatum,
} from "@/components/team-workload-chart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team" };

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [users, assignments] = await Promise.all([
    db.query.users.findMany({ orderBy: (u, { asc }) => [asc(u.name)] }),
    db.query.taskAssignees.findMany({ with: { task: true } }),
  ]);

  // Sum estimate points on each user's open (not done) tasks.
  const points = new Map<string, number>();
  const tasks = new Map<string, number>();
  for (const a of assignments) {
    if (!a.task || a.task.status === "DONE") continue;
    points.set(a.userId, (points.get(a.userId) ?? 0) + (a.task.estimate ?? 0));
    tasks.set(a.userId, (tasks.get(a.userId) ?? 0) + 1);
  }

  const data: WorkloadDatum[] = users
    .map((u) => ({
      name: u.name ?? u.email.split("@")[0],
      points: points.get(u.id) ?? 0,
      tasks: tasks.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points);

  const totalPoints = data.reduce((s, d) => s + d.points, 0);
  const active = data.filter((d) => d.points > 0).length;
  const avg = active > 0 ? Math.round(totalPoints / active) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Current workload by estimate points across all open, assigned tasks.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Open points (total)" value={totalPoints} />
        <Stat label="People with work" value={active} />
        <Stat label="Avg points / person" value={avg} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workload by person</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamWorkloadChart data={data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {data.map((d) => (
              <li
                key={d.name}
                className="flex items-center justify-between px-6 py-2.5 text-sm"
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
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-2xl font-semibold">{value}</span>
      </CardContent>
    </Card>
  );
}
