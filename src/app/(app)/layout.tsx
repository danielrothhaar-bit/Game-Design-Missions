import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import {
  listGames,
  listGameStatuses,
  listSidequests,
  listDivisions,
  hiddenDivisionsForUser,
} from "@/lib/queries";
import { getXpConfig } from "@/lib/config";
import { resolveUsers } from "@/lib/impersonation";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { effective: user, impersonating } = await resolveUsers();
  if (!user) redirect("/login");

  const [games, xpConfig, statuses, sidequests, allDivisions, hiddenDivs] =
    await Promise.all([
      listGames(),
      getXpConfig(),
      listGameStatuses(),
      listSidequests(),
      listDivisions(),
      hiddenDivisionsForUser(user.id),
    ]);
  const visibleDivisions = allDivisions.filter((d) => !hiddenDivs.has(d.slug));

  const sidebarProps = {
    statuses: statuses.map((s) => ({ slug: s.slug, label: s.label })),
    divisions: visibleDivisions.map((d) => ({ slug: d.slug, label: d.label })),
    games: games.map((g) => ({
      slug: g.slug,
      name: g.name,
      coverColor: g.coverColor,
      statusSlug: g.statusSlug ?? g.status,
      division: g.division,
      isLead: g.leadUserId === user.id,
    })),
    sidequests: sidequests.map((s) => ({
      slug: s.slug,
      name: s.name,
      coverColor: s.coverColor,
      statusSlug: s.statusSlug ?? "OPEN",
    })),
    user: {
      name: user.name,
      email: user.email,
      totalXp: user.totalXp,
      level: user.level,
      role: user.role,
    },
    xpConfig,
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {impersonating ? (
        <ImpersonationBanner name={user.name ?? user.email} />
      ) : null}
      <div className="flex min-h-0 flex-1 w-full overflow-hidden">
        <Sidebar {...sidebarProps} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            games={games.map((g) => ({ slug: g.slug, name: g.name }))}
            user={{
              name: user.name,
              email: user.email,
              image: user.image,
              level: user.level,
            }}
            isAdmin={user.role === "OWNER" || user.role === "ADMIN"}
            mobileNav={<MobileNav {...sidebarProps} />}
          />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
