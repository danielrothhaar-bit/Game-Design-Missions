import type { Metadata } from "next";
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
