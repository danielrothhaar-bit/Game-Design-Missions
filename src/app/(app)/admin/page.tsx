import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listSkills, listTeams } from "@/lib/queries";
import { getXpConfig } from "@/lib/config";
import { getPhaseTemplates } from "@/db/phase-templates";
import { SkillsAdmin } from "@/components/admin/skills-admin";
import { PhaseTasksAdmin } from "@/components/admin/phase-tasks-admin";
import { XpConfigAdmin } from "@/components/admin/xp-config-admin";
import { BadgesAdmin } from "@/components/admin/badges-admin";

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

  const [skills, teams, phaseTemplates, xpConfig, badgeRows] =
    await Promise.all([
      listSkills(true),
      listTeams(),
      getPhaseTemplates(),
      getXpConfig(),
      db.query.badges.findMany({ orderBy: (b, { asc }) => [asc(b.name)] }),
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

        <TabsContent value="xp" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">XP &amp; level rules</CardTitle>
            </CardHeader>
            <CardContent>
              <XpConfigAdmin initial={xpConfig} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <BadgesAdmin
                initial={badgeRows.map((b) => {
                  const criteria = (b.criteria ?? {}) as {
                    type?: string;
                    threshold?: number;
                  };
                  return {
                    code: b.code,
                    name: b.name,
                    description: b.description,
                    color: b.color,
                    threshold: criteria.threshold ?? null,
                    criteriaType: criteria.type ?? "—",
                  };
                })}
              />
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
