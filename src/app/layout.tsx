import type { Metadata } from "next";

import { NavigationMemory } from "@/components/NavigationMemory";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
import { SITE_URL } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import { StoreProvider } from "@/redux/provider";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Chess Preparatory - Opponent Intelligence",
  description:
    "Search your opponent, unlock prep, and walk in with a practical match plan.",
};

/**
 * Only what every page needs. The signed-in app's shell (AuthGate, Navbar,
 * import tracking) lives in (app)/layout.tsx; public pages, which crawlers and
 * signed-out visitors must be able to read, have their own in (public)/.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sets light or dark before the first paint; see lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <StoreProvider>
          <ThemeProvider>
            <GlobalLoader />
            <NavigationMemory />
            {children}
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
