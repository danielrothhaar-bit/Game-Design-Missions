"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  HelpCircle,
  LayoutGrid,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Icons live here (a Client Component) keyed by string. Server Components
// can't pass component functions across the boundary, so the sidebar passes
// a string key instead.
const ICONS = {
  briefcase: Briefcase,
  dashboard: BarChart3,
  grid: LayoutGrid,
  shield: Shield,
  users: Users,
  help: HelpCircle,
} as const;

export type SidebarIcon = keyof typeof ICONS;

export function SidebarLink({
  href,
  icon,
  label,
  exact = false,
}: {
  href: string;
  icon: SidebarIcon;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  const Icon = ICONS[icon];
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/90 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0 opacity-80" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function SidebarGameLink({
  slug,
  name,
  color,
  isLead = false,
}: {
  slug: string;
  name: string;
  color: string;
  isLead?: boolean;
}) {
  const pathname = usePathname();
  const [hasShield, setHasShield] = useState(true);
  const href = `/games/${slug}`;
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      title={isLead ? "You lead this game" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/90 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        isLead && !active && "bg-amber-400/10 text-foreground",
      )}
    >
      {hasShield ? (
        // eslint-disable-next-line @next/next/no-img-element -- per-game art
        <img
          src={`/games/${slug}.webp`}
          alt=""
          className="size-6 shrink-0 object-contain"
          onError={() => setHasShield(false)}
        />
      ) : (
        <span
          className="inline-block size-3 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
      <span className="truncate">{name}</span>
      {isLead ? (
        <Star className="ml-auto size-3 shrink-0 fill-amber-400 text-amber-400" />
      ) : null}
    </Link>
  );
}
