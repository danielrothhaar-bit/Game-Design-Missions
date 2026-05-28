import type { MetadataRoute } from "next";

/**
 * Web app manifest. Lets people "Add to Home Screen" on iPhone and
 * "Add to Dock" on macOS (Safari, Sonoma+) and have Missions launch as a
 * standalone app with our parchment theme.
 *
 * Served at /manifest.webmanifest via the Next.js metadata convention.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Missions",
    short_name: "Missions",
    description:
      "Project management and gamification for The Escape Game design studio.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f3e7c8", // parchment cream
    theme_color: "#7a1f1f", // deep burgundy — matches our --primary
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
