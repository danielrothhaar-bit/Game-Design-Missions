import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Semi_Condensed } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// The Escape Game type system. DIN Next LT Pro is TEG's licensed brand
// typeface; Barlow is the closest free grotesque and stands in for it here.
//   --font-display  → Barlow Semi Condensed (headlines, Camel Case)
//   --font-sans     → Barlow (body copy, UI)
//   --font-mono     → system monospace (numbers / codes), set in globals.css
const barlow = Barlow({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const barlowDisplay = Barlow_Semi_Condensed({
  variable: "--font-display",
  weight: ["600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Quests", template: "%s · Quests" },
  description:
    "Project management and gamification for game design teams.",
  applicationName: "Quests",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Quests",
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
    title: "Quests",
    description: "Project management for The Escape Game design studio.",
    siteName: "Quests",
  },
};

export const viewport: Viewport = {
  // Match the parchment background so iOS Safari's status-bar tint blends
  // when the app is launched standalone from the home screen.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#191919" },
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
      className={`${barlow.variable} ${barlowDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
