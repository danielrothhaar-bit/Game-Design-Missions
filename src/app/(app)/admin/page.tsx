import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listSkills, listTeams, listGameStatuses } from "@/lib/queries";
import { getXpConfig } from "@/lib/config";
import { getPhaseTemplates } from "@/db/phase-templates";
import { SkillsAdmin } from "@/components/admin/skills-admin";
import { PhaseTasksAdmin } from "@/components/admin/phase-tasks-admin";
import { XpConfigAdmin } from "@/components/admin/xp-config-admin";
import { BadgesAdmin } from "@/components/admin/badges-admin";
import { GameStatusesAdmin } from "@/components/admin/game-statuses-admin";
import { UsersAdmin } from "@/components/admin/users-admin";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, session.user.id),
  });
  if (!me) redirect("/login");
  // Authoritative role check against the DB (not the JWT).
  if (me.role !== "OWNER" && me.role !== "ADMIN") redirect("/my-work");

  const [
    skills,
    teams,
    phaseTemplates,
    xpConfig,
    badgeRows,
    gameStatuses,
    userRows,
    userSkillRows,
  ] = await Promise.all([
    listSkills(true),
    listTeams(),
    getPhaseTemplates(),
    getXpConfig(),
    db.query.badges.findMany({ orderBy: (b, { asc }) => [asc(b.name)] }),
    listGameStatuses(),
    db.query.users.findMany({ orderBy: (u, { asc }) => [asc(u.name)] }),
    db.query.userSkills.findMany(),
  ]);

  const skillsByUser = new Map<string, Record<string, number>>();
  for (const us of userSkillRows) {
    const m = skillsByUser.get(us.userId) ?? {};
    m[us.skillId] = us.level;
    skillsByUser.set(us.userId, m);
  }

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
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="statuses">Game Statuses</TabsTrigger>
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
                    imageUrl: b.imageUrl ?? null,
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

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team members</CardTitle>
            </CardHeader>
            <CardContent>
              <UsersAdmin
                skills={skills.map((s) => ({
                  id: s.id,
                  name: s.name,
                  color: s.color,
                }))}
                initialUsers={userRows.map((u) => ({
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  skills: skillsByUser.get(u.id) ?? {},
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statuses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Game statuses</CardTitle>
            </CardHeader>
            <CardContent>
              <GameStatusesAdmin
                initial={gameStatuses.map((s) => ({
                  slug: s.slug,
                  label: s.label,
                  color: s.color,
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
