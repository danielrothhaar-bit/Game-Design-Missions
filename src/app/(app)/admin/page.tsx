import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listSkills,
  listTeams,
  listGameStatuses,
  listDivisions,
  listGames,
  listAllGames,
} from "@/lib/queries";
import { getXpConfig } from "@/lib/config";
import { getPhaseTemplates } from "@/db/phase-templates";
import { SkillsAdmin } from "@/components/admin/skills-admin";
import { TaskTemplatesAdmin } from "@/components/admin/phase-tasks-admin";
import { XpConfigAdmin } from "@/components/admin/xp-config-admin";
import { BadgesAdmin } from "@/components/admin/badges-admin";
import { GameStatusesAdmin } from "@/components/admin/game-statuses-admin";
import { UsersAdmin } from "@/components/admin/users-admin";
import { DivisionsAdmin } from "@/components/admin/divisions-admin";
import { GamesManager } from "@/components/games/games-manager";
import { TaskDefaultsAdmin } from "@/components/admin/task-defaults-admin";
import { DesignSuiteAdmin } from "@/components/admin/design-suite-admin";
import { designSuiteConfigured } from "@/lib/design-suite";

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
    gameRows,
  ] = await Promise.all([
    listSkills(true),
    listTeams(),
    getPhaseTemplates(),
    getXpConfig(),
    db.query.badges.findMany({ orderBy: (b, { asc }) => [asc(b.name)] }),
    listGameStatuses(),
    db.query.users.findMany({ orderBy: (u, { asc }) => [asc(u.name)] }),
    db.query.userSkills.findMany(),
    listGames(),
  ]);

  const configRow = await db.query.appConfig.findFirst();

  const dsMapRows = await db.query.designSuiteUserMap.findMany({
    orderBy: (m, { asc }) => [asc(m.designSuiteName)],
  });

  const [divisionRows, userDivisionRows, completedAssignments, allGames] =
    await Promise.all([
      listDivisions(),
      db.query.userDivisions.findMany(),
      db.query.taskAssignees.findMany({
        with: {
          task: {
            columns: { status: true },
            with: { skills: { columns: { skillId: true, level: true } } },
          },
        },
      }),
      listAllGames(),
    ]);

  // Promotion check: completed tasks per user/skill/difficulty vs the skill's
  // threshold, where the member's current proficiency is below that level.
  const DIFF_LEVEL: Record<string, number> = {
    BEGINNER: 1,
    INTERMEDIATE: 2,
    ADVANCED: 3,
    EXPERT: 4,
  };
  const DIFF_LABEL: Record<string, string> = {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    ADVANCED: "Advanced",
    EXPERT: "Expert",
  };
  const completedCounts = new Map<string, number>(); // userId|skillId|level
  for (const a of completedAssignments) {
    if (!a.task || a.task.status !== "DONE") continue;
    for (const ts of a.task.skills) {
      const key = `${a.userId}|${ts.skillId}|${ts.level}`;
      completedCounts.set(key, (completedCounts.get(key) ?? 0) + 1);
    }
  }
  const userById = new Map(userRows.map((u) => [u.id, u]));
  const skillById = new Map(skills.map((s) => [s.id, s]));
  const profByUserSkill = new Map<string, number>();
  for (const us of userSkillRows) {
    profByUserSkill.set(`${us.userId}|${us.skillId}`, us.level);
  }
  const promotions = [...completedCounts.entries()]
    .map(([key, count]) => {
      const [userId, skillId, level] = key.split("|");
      const skill = skillById.get(skillId);
      const user = userById.get(userId);
      if (!skill || !user) return null;
      const targetLevel = DIFF_LEVEL[level] ?? 0;
      const proficiency = profByUserSkill.get(`${userId}|${skillId}`) ?? 0;
      if (count < skill.promotionThreshold || proficiency >= targetLevel) {
        return null;
      }
      return {
        key,
        userName: user.name ?? user.email,
        skill: skill.name,
        level: DIFF_LABEL[level] ?? level,
        count,
        threshold: skill.promotionThreshold,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => b.count - a.count);

  const skillsByUser = new Map<string, Record<string, number>>();
  for (const us of userSkillRows) {
    const m = skillsByUser.get(us.userId) ?? {};
    m[us.skillId] = us.level;
    skillsByUser.set(us.userId, m);
  }
  const hiddenDivsByUser = new Map<string, string[]>();
  for (const ud of userDivisionRows) {
    if (!ud.hidden) continue;
    const arr = hiddenDivsByUser.get(ud.userId) ?? [];
    arr.push(ud.divisionSlug);
    hiddenDivsByUser.set(ud.userId, arr);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Configure progression, rewards, skills, and game templates.
        </p>
      </header>

      {promotions.length > 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base text-amber-300">
              Promotion check ({promotions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {promotions.map((p) => (
              <div
                key={p.key}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>
                  <strong>{p.userName}</strong> has completed {p.count}{" "}
                  {p.level} <span className="text-muted-foreground">·</span>{" "}
                  {p.skill}
                </span>
                <span className="text-xs text-muted-foreground">
                  ready to promote to {p.level} (≥ {p.threshold})
                </span>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Set each skill&rsquo;s threshold in the Skills tab. Promote a
              member by raising their proficiency in Users → Settings.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="xp">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="xp">XP &amp; Levels</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="statuses">Game Statuses</TabsTrigger>
          <TabsTrigger value="divisions">Divisions</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="phases">Task Templates</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="integration" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Game Design Suite — action item sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DesignSuiteAdmin
                initialMap={dsMapRows.map((m) => ({
                  designSuiteName: m.designSuiteName,
                  email: m.email,
                }))}
                configured={designSuiteConfigured()}
                lastSync={
                  configRow?.designSuiteSyncCursor
                    ? configRow.designSuiteSyncCursor.toISOString()
                    : null
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xp" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">XP &amp; level rules</CardTitle>
            </CardHeader>
            <CardContent>
              <XpConfigAdmin initial={xpConfig} />
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Task defaults</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskDefaultsAdmin
                initial={{
                  autoDueDates: configRow?.autoDueDates ?? true,
                  dueLeadUrgent: configRow?.dueLeadUrgent ?? 2,
                  dueLeadHigh: configRow?.dueLeadHigh ?? 7,
                  dueLeadMedium: configRow?.dueLeadMedium ?? 14,
                  dueLeadLow: configRow?.dueLeadLow ?? 30,
                }}
              />
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
                  promotionThreshold: s.promotionThreshold,
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
                divisions={divisionRows.map((d) => ({
                  slug: d.slug,
                  label: d.label,
                }))}
                initialUsers={userRows.map((u) => ({
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  skills: skillsByUser.get(u.id) ?? {},
                  hiddenDivisions: hiddenDivsByUser.get(u.id) ?? [],
                  hasPassword: u.passwordHash != null,
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

        <TabsContent value="divisions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Divisions</CardTitle>
            </CardHeader>
            <CardContent>
              <DivisionsAdmin
                initial={divisionRows.map((d) => ({
                  slug: d.slug,
                  label: d.label,
                  color: d.color,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games" className="mt-4">
          <GamesManager
            divisions={divisionRows.map((d) => ({
              slug: d.slug,
              label: d.label,
              color: d.color,
            }))}
            statuses={gameStatuses.map((s) => ({ slug: s.slug, label: s.label }))}
            games={allGames.map((g) => ({
              id: g.id,
              slug: g.slug,
              name: g.name,
              division: g.division,
              coverColor: g.coverColor,
              coverImage: g.coverImage,
              statusSlug: g.statusSlug ?? g.status,
              archived: g.archivedAt !== null,
            }))}
          />
        </TabsContent>

        <TabsContent value="phases" className="mt-4">
          <TaskTemplatesAdmin
            teams={teams.map((t) => ({
              id: t.id,
              name: t.name,
              color: t.color,
            }))}
            skills={skills
              .filter((s) => !s.archived)
              .map((s) => ({ id: s.id, name: s.name, color: s.color }))}
            games={gameRows.map((g) => ({ id: g.id, name: g.name }))}
            initialPhases={phaseTemplates.map((p) => ({
              id: p.id,
              name: p.name,
              color: p.color,
              tasks: p.tasks.map((t) => ({
                id: t.id,
                title: t.title,
                teamId: t.teamId ?? null,
                priority: t.priority,
                scopeSize: t.scopeSize,
                skills: t.skills.map((s) => ({
                  skillId: s.skillId,
                  level: s.level,
                })),
              })),
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
