"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItemsFor, isActivePath } from "./nav-items";

export function TopbarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = navItemsFor(isAdmin);

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((it) => {
        const active = isActivePath(pathname, it);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "group/topnav relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium uppercase tracking-[0.08em] transition-colors",
              "font-display",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
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
