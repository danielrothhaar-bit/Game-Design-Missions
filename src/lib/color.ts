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

/**
 * Most prominent vivid (non-black/white/transparent) color in a flat RGBA
 * pixel array. Shared by the client upload path and the server-side
 * backfill so both derive colors identically. Returns null when the image
 * is essentially monochrome.
 */
export function dominantColorFromRgba(data: ArrayLike<number>): string | null {
  const buckets = new Map<
    string,
    { count: number; r: number; g: number; b: number }
  >();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue; // transparent
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 45) continue; // near-black
    if (min > 210) continue; // near-white
    if (max - min < 18 && max > 60 && max < 200) continue; // dull gray
    // Quantize to 5 bits per channel so similar shades group together.
    const key = `${r >> 3}-${g >> 3}-${b >> 3}`;
    const e = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    e.count++;
    e.r += r;
    e.g += g;
    e.b += b;
    buckets.set(key, e);
  }
  let best: { count: number; r: number; g: number; b: number } | null = null;
  for (const e of buckets.values()) {
    if (!best || e.count > best.count) best = e;
  }
  if (!best) return null;
  return toHex(best.r / best.count, best.g / best.count, best.b / best.count);
}
