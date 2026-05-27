"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function GameTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/games/${slug}`;
  const tabs = [
    { href: base, label: "List", active: pathname === base },
    {
      href: `${base}/board`,
      label: "Board",
      active: pathname === `${base}/board`,
    },
    {
      href: `${base}/timeline`,
      label: "Timeline",
      active: pathname === `${base}/timeline`,
    },
  ];
  return (
    <nav className="flex items-center gap-1 text-sm">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "rounded-md px-3 py-1.5 transition-colors",
            t.active
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
          aria-current={t.active ? "page" : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
