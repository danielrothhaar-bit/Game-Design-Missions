import { cn } from "@/lib/utils";

/**
 * Missions mark — a labyrinth ring around a padlock.
 *
 * Drawn as inline SVG with `currentColor`, so it themes automatically:
 * on parchment it reads as deep ink, on dark-stone it inherits the gold
 * foreground. The keyhole punches through to whatever sits behind the
 * mark via the page background variable.
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
      {/* Outer labyrinth ring — open at the lower-left */}
      <path
        d="M 50 6 A 44 44 0 1 1 6 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="square"
      />
      {/* Inner ring — open at the upper-right, mirroring the outer gap */}
      <path
        d="M 26 50 A 24 24 0 1 0 74 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="square"
      />
      {/* Padlock shackle */}
      <path
        d="M 41 48 V 42 a 9 9 0 0 1 18 0 V 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Padlock body */}
      <rect x="36" y="48" width="28" height="22" rx="1.5" fill="currentColor" />
      {/* Keyhole — cut out via page background so it themes correctly */}
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
