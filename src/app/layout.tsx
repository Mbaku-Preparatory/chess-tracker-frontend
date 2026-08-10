import type { Metadata } from "next";

import { ActiveImportsIndicator } from "@/components/import/ActiveImportsIndicator";
import { ActiveImportsProvider } from "@/components/import/ActiveImportsProvider";
import { AuthGate } from "@/components/AuthGate";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
import { Navbar } from "@/components/ui/Navbar";
import { StoreProvider } from "@/redux/provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Mbaku Preparatory - Opponent Intelligence",
  description:
    "Search your opponent, unlock prep, and walk in with a practical match plan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <StoreProvider>
          <ThemeProvider>
            <GlobalLoader />
            <AuthGate>
              {/*
                Inside AuthGate: the poller needs a signed-in user, and there
                is nothing to report on the login screen.
              */}
              <ActiveImportsProvider>
                <Navbar />
                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                  {children}
                </main>
                <ActiveImportsIndicator />
              </ActiveImportsProvider>
            </AuthGate>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
