"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  taskPriorityColor,
  taskStatusColor,
  taskStatusLabel,
} from "@/lib/format";

export type MemberTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueMs: number | null;
  gameName: string;
  gameSlug: string;
};

export type TeamMember = {
  id: string;
  name: string;
  open: MemberTask[];
  today: MemberTask[];
};

export function TeamMemberWork({ members }: { members: TeamMember[] }) {
  if (members.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        No team members yet.
      </p>
    );
  }
  // eslint-disable-next-line react-hooks/purity -- overdue comparison at render
  const now = Date.now();

  return (
    <Tabs defaultValue={members[0].id}>
      <TabsList className="max-w-full overflow-x-auto">
        {members.map((m) => (
          <TabsTrigger key={m.id} value={m.id}>
            {m.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {members.map((m) => (
        <TabsContent key={m.id} value={m.id} className="mt-4">
          <Tabs defaultValue="open">
            <TabsList>
              <TabsTrigger value="open">Open ({m.open.length})</TabsTrigger>
              <TabsTrigger value="today">Today ({m.today.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="open" className="mt-3">
              <TaskList
                tasks={m.open}
                now={now}
                empty="Nothing open right now."
              />
            </TabsContent>
            <TabsContent value="today" className="mt-3">
              <TaskList
                tasks={m.today}
                now={now}
                empty="Nothing planned for today."
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TaskList({
  tasks,
  now,
  empty,
}: {
  tasks: MemberTask[];
  now: number;
  empty: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {tasks.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <span
                className={`hidden shrink-0 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:inline ${taskStatusColor(t.status)}`}
              >
                {taskStatusLabel(t.status)}
              </span>
              <span
                className={`w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wider ${taskPriorityColor(t.priority)}`}
              >
                {t.priority.toLowerCase()}
              </span>
              <Link
                href={`/games/${t.gameSlug}`}
                className="flex-1 truncate hover:underline"
              >
                {t.title}
              </Link>
              <span className="hidden text-xs text-muted-foreground md:block">
                {t.gameName}
              </span>
              {t.dueMs !== null ? (
                <span
                  className={`hidden text-xs sm:block ${
                    t.dueMs < now ? "text-red-400" : "text-muted-foreground"
                  }`}
                >
                  {new Date(t.dueMs).toLocaleDateString()}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
