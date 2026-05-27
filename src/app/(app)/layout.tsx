import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import {
  listGames,
  getUser,
  listGameStatuses,
  listSidequests,
} from "@/lib/queries";
import { getXpConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [games, user, xpConfig, statuses, sidequests] = await Promise.all([
    listGames(),
    getUser(session.user.id),
    getXpConfig(),
    listGameStatuses(),
    listSidequests(),
  ]);
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        statuses={statuses.map((s) => ({ slug: s.slug, label: s.label }))}
        games={games.map((g) => ({
          slug: g.slug,
          name: g.name,
          coverColor: g.coverColor,
          statusSlug: g.statusSlug ?? g.status,
          isLead: g.leadUserId === user.id,
        }))}
        sidequests={sidequests.map((s) => ({
          slug: s.slug,
          name: s.name,
          coverColor: s.coverColor,
          statusSlug: s.statusSlug ?? "OPEN",
        }))}
        user={{
          name: user.name,
          email: user.email,
          totalXp: user.totalXp,
          level: user.level,
          role: user.role,
        }}
        xpConfig={xpConfig}
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
