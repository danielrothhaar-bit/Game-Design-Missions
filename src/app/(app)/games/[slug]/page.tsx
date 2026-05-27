import { notFound } from "next/navigation";
import {
  getGameBySlug,
  getTasksForGame,
  listSkills,
  listTeams,
  listUsers,
} from "@/lib/queries";
import { TaskListView } from "@/components/games/task-list-view";
import type { Priority, Status } from "@/components/games/status-select";
import type { AssigneeUser } from "@/components/games/assignee-select";
import type { SkillLevel } from "@/components/games/task-meta-selects";

export default async function GameListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();

  const [taskRows, users, teams, skills] = await Promise.all([
    getTasksForGame(game.id),
    listUsers(),
    listTeams(),
    listSkills(),
  ]);

  const gameDesignTeamId =
    teams.find((t) => t.slug === "product-design")?.id ?? null;

  const userOptions: AssigneeUser[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
  }));

  const tasks = taskRows.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status as Status,
    priority: t.priority as Priority,
    estimate: t.estimate,
    estimateLocked: t.estimateLocked,
    dueDate: t.dueDate ?? null,
    position: t.position,
    teamId: t.teamId ?? null,
    createdByName: t.createdBy?.name ?? t.createdBy?.email ?? null,
    skills: t.skills.map((ts) => ({
      skillId: ts.skillId,
      level: ts.level as SkillLevel,
    })),
    assignees: t.assignees.map((a) => ({
      isPrimary: a.isPrimary,
      user: {
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        image: a.user.image,
      },
    })),
    labels: t.labels.map((l) => ({
      label: { id: l.label.id, name: l.label.name, color: l.label.color },
    })),
  }));

  return (
    <TaskListView
      game={{ id: game.id, slug: game.slug, name: game.name }}
      initialTasks={tasks}
      users={userOptions}
      teams={teams.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
      skills={skills.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
      gameDesignTeamId={gameDesignTeamId}
    />
  );
}
