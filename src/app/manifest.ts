import type { MetadataRoute } from "next";

/**
 * Web app manifest. Lets people "Add to Home Screen" on iPhone and
 * "Add to Dock" on macOS (Safari, Sonoma+) and have Quests launch as a
 * standalone app with our parchment theme.
 *
 * Served at /manifest.webmanifest via the Next.js metadata convention.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quests",
    short_name: "Quests",
    description:
      "Project management and gamification for The Escape Game design studio.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff", // Cosmo White
    theme_color: "#ff4863", // Cosmo Red — matches our --primary
    categories: ["productivity", "business"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
