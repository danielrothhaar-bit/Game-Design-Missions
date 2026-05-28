import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null; // bad/undecodable cookie — treat as logged out
  }
  // Only redirect if the session points at a user that still exists.
  // After a DB reset, a stale JWT would otherwise bounce between /login
  // and /my-work forever.
  if (session?.user?.id) {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });
    if (dbUser) redirect("/my-work");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo size={88} className="text-primary" />
          <h1 className="font-display text-3xl font-semibold tracking-wide">
            Welcome to Missions
          </h1>
          <p className="text-center text-sm italic text-muted-foreground">
            Sign in with your studio email. Google SSO coming soon.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
