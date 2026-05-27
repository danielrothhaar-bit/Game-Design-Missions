import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ON_TIME,
  EARLY,
  LATE,
  ASSIST_PCT,
  TITLE_BY_LEVEL,
  xpForLevel,
} from "@/lib/xp";
import { STARTER_BADGES } from "@/lib/badges";
import { listSkills, listTeams } from "@/lib/queries";
import { getPhaseTemplates } from "@/db/phase-templates";
import { SkillsAdmin } from "@/components/admin/skills-admin";
import { PhaseTasksAdmin } from "@/components/admin/phase-tasks-admin";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    redirect("/my-work");
  }

  const me = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, session.user.id),
  });
  if (!me) redirect("/login");

  const [skills, teams, phaseTemplates] = await Promise.all([
    listSkills(true),
    listTeams(),
    getPhaseTemplates(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Configure progression, rewards, skills, and game templates.
        </p>
      </header>

      <Tabs defaultValue="xp">
        <TabsList>
          <TabsTrigger value="xp">XP &amp; Levels</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="phases">Phase Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="xp" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">XP rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="XP per estimate point" value="10 XP" />
              <Row label="On-time multiplier" value={`${ON_TIME}%`} />
              <Row label="Early multiplier" value={`${EARLY}%`} />
              <Row label="Late multiplier" value={`${LATE}%`} />
              <Row label="Reviewer assist XP" value={`${ASSIST_PCT}%`} />
              <p className="pt-2 text-xs text-muted-foreground">
                Editing these values lands in the next update — for now they
                reflect the live rules.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Levels &amp; titles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {TITLE_BY_LEVEL.map((t) => (
                <Row
                  key={t.from}
                  label={`Level ${t.from}+ · ${t.title}`}
                  value={`${xpForLevel(t.from).toLocaleString()} XP`}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Badges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {STARTER_BADGES.map((b) => (
                <div
                  key={b.code}
                  className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.description}
                    </p>
                  </div>
                  <Badge variant="secondary" style={{ color: b.color }}>
                    {b.icon}
                  </Badge>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">
                Editable badge criteria + custom badges land in the next update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skills bank</CardTitle>
            </CardHeader>
            <CardContent>
              <SkillsAdmin
                initialSkills={skills.map((s) => ({
                  id: s.id,
                  name: s.name,
                  color: s.color,
                  archived: s.archived,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phases" className="mt-4">
          <PhaseTasksAdmin
            teams={teams.map((t) => ({
              id: t.id,
              name: t.name,
              color: t.color,
            }))}
            initialPhases={phaseTemplates.map((p) => ({
              id: p.id,
              name: p.name,
              color: p.color,
              tasks: p.tasks.map((t) => ({
                id: t.id,
                title: t.title,
                teamId: t.teamId ?? null,
              })),
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
