"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Missions mark. Tries to load the real PNG from /brand/logo.png (or
 * /brand/logo-light.png in dark mode). If the file isn't on disk, falls
 * back to an inline SVG approximation so we always render something.
 *
 * Drop a logo at public/brand/logo.png (and optionally
 * public/brand/logo-light.png for dark mode) and it'll appear everywhere.
 */
export function Logo({
  className,
  size = 32,
  title = "Missions",
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [src, setSrc] = useState<string | null>(
    resolvedTheme === "dark" ? "/brand/logo-light.png" : "/brand/logo.png",
  );

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- inline brand mark
      <img
        src={src}
        width={size}
        height={size}
        alt={title}
        className={cn("shrink-0 object-contain", className)}
        // If the PNG isn't there yet, drop to the SVG below.
        onError={() => setSrc(null)}
      />
    );
  }
  return <LogoSvg size={size} title={title} className={className} />;
}

function LogoSvg({
  className,
  size,
  title,
}: {
  className?: string;
  size: number;
  title: string;
}) {
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    >
      <title>{title}</title>
      <path
        d="M 50 6 A 44 44 0 1 1 6 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="square"
      />
      <path
        d="M 26 50 A 24 24 0 1 0 74 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="square"
      />
      <path
        d="M 41 48 V 42 a 9 9 0 0 1 18 0 V 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="36" y="48" width="28" height="22" rx="1.5" fill="currentColor" />
      <circle cx="50" cy="57" r="2.6" fill="var(--background)" />
      <rect x="48.8" y="57" width="2.4" height="8" fill="var(--background)" />
    </svg>
  );
}

/** Lockup: logo + word "MISSIONS" beside it. Used in the topbar. */
export function LogoLockup({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logo size={size} />
      <span className="font-display text-[15px] font-semibold tracking-[0.18em] uppercase text-foreground">
        Missions
      </span>
    </span>
  );
}
