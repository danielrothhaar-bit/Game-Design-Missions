import { eq, isNotNull } from "drizzle-orm";
import sharp from "sharp";
import { db } from "./index";
import { games } from "./schema";
import { dominantColorFromRgba } from "../lib/color";

/**
 * One-time backfill: for every game that already has an uploaded logo
 * (coverImage data URL), decode it and set coverColor to the logo's most
 * prominent non-black/white color — the same derivation the upload path
 * now does. Games without an uploaded logo are left untouched.
 *
 * Idempotent per row: re-deriving the same image yields the same color.
 */
export async function backfillLogoColors(): Promise<number> {
  const rows = await db.query.games.findMany({
    where: isNotNull(games.coverImage),
    columns: { id: true, coverImage: true },
  });

  let updated = 0;
  for (const row of rows) {
    const dataUrl = row.coverImage;
    if (!dataUrl) continue;
    const comma = dataUrl.indexOf(",");
    if (!dataUrl.startsWith("data:") || comma === -1) continue;
    try {
      const buf = Buffer.from(dataUrl.slice(comma + 1), "base64");
      const { data } = await sharp(buf)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const color = dominantColorFromRgba(data);
      if (!color) continue; // monochrome logo → keep existing color
      await db.update(games).set({ coverColor: color }).where(eq(games.id, row.id));
      updated++;
    } catch (err) {
      console.warn(`⚠ could not derive color for game ${row.id}:`, err);
    }
  }
  return updated;
}
