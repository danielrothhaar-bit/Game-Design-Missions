"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  LayoutDashboard,
  Grid,
  Users,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** match only the exact path (otherwise the link is active for prefixes) */
  exact?: boolean;
};

const ITEMS: Item[] = [
  { href: "/my-work", label: "My Quests", icon: Briefcase, exact: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/games", label: "All Games", icon: Grid, exact: true },
  { href: "/team", label: "Hall of Heroes", icon: Users, exact: true },
];

const ADMIN_ITEM: Item = {
  href: "/admin",
  label: "Admin",
  icon: Shield,
};

export function TopbarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS;

  return (
    <nav className="hidden items-center gap-0.5 md:flex">
      {items.map((it) => {
        const active = it.exact
          ? pathname === it.href
          : pathname === it.href || pathname.startsWith(`${it.href}/`);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "group/topnav relative inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.08em] transition-colors",
              "font-display",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            <span>{it.label}</span>
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-[2px] bg-primary"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
