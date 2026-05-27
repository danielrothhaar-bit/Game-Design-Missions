import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listGameStatuses } from "@/lib/queries";
import { DIVISIONS } from "@/lib/format";
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
  const statuses = await listGameStatuses();
  const initialDivision =
    DIVISIONS.find((d) => d.slug === division)?.slug ?? DIVISIONS[0].slug;

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
        divisions={DIVISIONS}
        initialDivision={initialDivision}
      />
    </div>
  );
}
