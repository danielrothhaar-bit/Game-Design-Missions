import { notFound } from "next/navigation";
import { getGameBySlug, getTasksForGame, listTeams } from "@/lib/queries";
import { BoardView, type BoardTask } from "@/components/games/board-view";
import type { Priority, Status } from "@/components/games/status-select";

export const dynamic = "force-dynamic";

export default async function GameBoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();

  const [taskRows, teams] = await Promise.all([
    getTasksForGame(game.id),
    listTeams(),
  ]);
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const gameDesignTeamId =
    teams.find((t) => t.slug === "product-design")?.id ?? null;

  const tasks: BoardTask[] = taskRows.map((t) => {
    const primary = t.assignees.find((a) => a.isPrimary) ?? t.assignees[0];
    const team = t.teamId ? teamById.get(t.teamId) : undefined;
    return {
      id: t.id,
      title: t.title,
      status: t.status as Status,
      priority: t.priority as Priority,
      dueMs: t.dueDate ? t.dueDate.getTime() : null,
      teamId: t.teamId ?? null,
      assignee: primary
        ? {
            name: primary.user.name,
            email: primary.user.email,
            image: primary.user.image,
          }
        : null,
      team: team ? { name: team.name, color: team.color } : null,
      skillCount: t.skills.length,
    };
  });

  return (
    <BoardView initialTasks={tasks} gameDesignTeamId={gameDesignTeamId} />
  );
}
