import type { Metadata, Viewport } from "next";
import { Cinzel, EB_Garamond, VT323 } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Fantasy/parchment type system:
//   --font-display  → Cinzel (engraved-stone serif, headings & buttons)
//   --font-sans     → EB Garamond (warm humanist serif, body)
//   --font-mono     → VT323 (pixel mono, numbers / tags / "system" labels)
const cinzel = Cinzel({
  variable: "--font-display",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});
const garamond = EB_Garamond({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const vt323 = VT323({
  variable: "--font-mono",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Missions", template: "%s · Missions" },
  description:
    "Project management and gamification for game design teams.",
  applicationName: "Missions",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Missions",
    statusBarStyle: "default",
  },
  // Explicit icons so Apple picks up the right home-screen image even
  // though we also auto-serve apple-touch-icon.png from /public.
  icons: {
    icon: [
      { url: "/icon.png", sizes: "64x64", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // Used by iOS's "Add to Home Screen" preview and link unfurls.
  openGraph: {
    title: "Missions",
    description: "Project management for The Escape Game design studio.",
    siteName: "Missions",
  },
};

export const viewport: Viewport = {
  // Match the parchment background so iOS Safari's status-bar tint blends
  // when the app is launched standalone from the home screen.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3e7c8" },
    { media: "(prefers-color-scheme: dark)", color: "#2a1f15" },
  ],
  // Important for PWAs — no zooming on input focus, full-width layout.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cinzel.variable} ${garamond.variable} ${vt323.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
