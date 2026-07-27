import {
  Briefcase,
  LayoutDashboard,
  Users,
  Shield,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** match only the exact path (otherwise the link is active for prefixes) */
  exact?: boolean;
  /** only show to owners/admins */
  adminOnly?: boolean;
};

/**
 * Primary app sections. Shared by the desktop top-bar nav and the mobile
 * drawer so there's a single source of truth for "where can I go".
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/my-work", label: "My Quests", icon: Briefcase, exact: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/team", label: "Team", icon: Users, exact: true },
  { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

export function navItemsFor(isAdmin: boolean): NavItem[] {
  return NAV_ITEMS.filter((it) => !it.adminOnly || isAdmin);
}

export function isActivePath(
  pathname: string,
  it: Pick<NavItem, "href" | "exact">,
): boolean {
  return it.exact
    ? pathname === it.href
    : pathname === it.href || pathname.startsWith(`${it.href}/`);
}
