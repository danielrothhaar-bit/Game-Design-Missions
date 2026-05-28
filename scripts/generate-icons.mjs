#!/usr/bin/env node
/**
 * Generates PWA + favicon icons from public/brand/logo.webp.
 *
 * Outputs:
 *   public/icons/icon-192.png        — manifest "any" purpose
 *   public/icons/icon-512.png        — manifest "any" purpose
 *   public/icons/icon-maskable.png   — manifest "maskable" purpose (extra padding)
 *   public/apple-touch-icon.png      — iOS home-screen icon (180×180)
 *   public/icon.png                  — favicon (64×64)
 *
 * Re-run after the logo changes.
 */

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const PARCHMENT = "#f3e7c8"; // matches the --background token
const SRC = resolve("public", "brand", "logo.webp");
const ICONS_DIR = resolve("public", "icons");
const PUB_DIR = resolve("public");
mkdirSync(ICONS_DIR, { recursive: true });

/**
 * Renders the logo centered on a parchment background at `size`×`size`.
 * `paddingPct` is the inset on each side as a fraction (0.10 = 10% on every edge).
 */
async function renderIcon(outPath, size, paddingPct) {
  const inner = Math.round(size * (1 - paddingPct * 2));
  const offset = Math.round((size - inner) / 2);

  const logoBuf = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: PARCHMENT,
    },
  })
    .composite([{ input: logoBuf, top: offset, left: offset }])
    .png()
    .toFile(outPath);

  console.log(`  → ${outPath} (${size}×${size}, ${Math.round(paddingPct * 100)}% padding)`);
}

console.log("Rendering icons from", SRC);

await renderIcon(resolve(ICONS_DIR, "icon-192.png"), 192, 0.10);
await renderIcon(resolve(ICONS_DIR, "icon-512.png"), 512, 0.10);
// Maskable: the OS may crop the outer 20% — give the logo a tighter safe zone.
await renderIcon(resolve(ICONS_DIR, "icon-maskable.png"), 512, 0.22);
// iOS home-screen icon (180×180). iOS does not mask, so use normal padding.
await renderIcon(resolve(PUB_DIR, "apple-touch-icon.png"), 180, 0.10);
// Favicon — small + denser padding so the silhouette is recognizable.
await renderIcon(resolve(PUB_DIR, "icon.png"), 64, 0.10);

console.log("done.");
