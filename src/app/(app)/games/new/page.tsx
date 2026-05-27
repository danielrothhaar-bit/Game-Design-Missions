import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listGameStatuses, listDivisions } from "@/lib/queries";
import { NewGameForm } from "./new-game-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Project" };

export default async function NewGamePage({
  searchParams,
}: {
  searchParams: Promise<{ division?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { division } = await searchParams;
  const [statuses, divisions] = await Promise.all([
    listGameStatuses(),
    listDivisions(),
  ]);
  const initialDivision =
    divisions.find((d) => d.slug === division)?.slug ??
    divisions[0]?.slug ??
    "TEG_GAMES";

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New Project</h1>
        <p className="text-sm text-muted-foreground">
          Spin up a project. We&rsquo;ll pre-build the standard phases and task
          list, each assigned to its responsible team.
        </p>
      </header>
      <NewGameForm
        statuses={statuses.map((s) => ({ slug: s.slug, label: s.label }))}
        divisions={divisions.map((d) => ({ slug: d.slug, label: d.label }))}
        initialDivision={initialDivision}
      />
    </div>
  );
}
