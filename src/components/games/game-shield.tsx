"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Per-game pixel-art shield. Looks for /games/<slug>.webp (or .png) and
 * renders nothing if neither exists, so we can add shields one game at a
 * time without code changes — just drop a file in public/games/.
 */
export function GameShield({
  slug,
  size = 40,
  className,
}: {
  slug: string;
  size?: number;
  className?: string;
}) {
  const candidates = [`/games/${slug}.webp`, `/games/${slug}.png`];
  const [idx, setIdx] = useState(0);
  if (idx >= candidates.length) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- per-game art
    <img
      src={candidates[idx]}
      width={size}
      height={size}
      alt=""
      className={cn("shrink-0 object-contain", className)}
      onError={() => setIdx((i) => i + 1)}
    />
  );
}
