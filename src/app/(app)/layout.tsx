import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { listGames, getUser } from "@/lib/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [games, user] = await Promise.all([
    listGames(),
    getUser(session.user.id),
  ]);
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        games={games.map((g) => ({
          slug: g.slug,
          name: g.name,
          coverColor: g.coverColor,
        }))}
        user={{
          name: user.name,
          email: user.email,
          totalXp: user.totalXp,
          level: user.level,
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          games={games.map((g) => ({ slug: g.slug, name: g.name }))}
          user={{
            name: user.name,
            email: user.email,
            image: user.image,
            level: user.level,
          }}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
