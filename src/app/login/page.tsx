import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/my-work");

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground text-xl font-semibold">
            Q
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to Quests
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            Sign in with your studio email. Google SSO coming soon.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
