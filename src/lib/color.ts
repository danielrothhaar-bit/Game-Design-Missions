/** Small color helpers for deriving readable UI from an arbitrary hex. */

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Perceived brightness (0–255). */
export function brightness(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 128;
  const [r, g, b] = rgb;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Near-black ink or near-white, whichever reads better on `hex`. */
export function readableOn(hex: string): string {
  return brightness(hex) > 150 ? "#171717" : "#ffffff";
}

/** Darken a hex color by `amount` (0–1). */
export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = 1 - Math.max(0, Math.min(1, amount));
  return toHex(rgb[0] * f, rgb[1] * f, rgb[2] * f);
}
