import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NewSidequestForm } from "./new-sidequest-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Sidequest" };

export default async function NewSidequestPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New Sidequest</h1>
        <p className="text-sm text-muted-foreground">
          A lightweight quest — just a name and a task list. No launch date or
          build phases.
        </p>
      </header>
      <NewSidequestForm />
    </div>
  );
}
