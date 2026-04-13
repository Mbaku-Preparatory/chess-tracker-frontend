import type { Metadata } from "next";

import { AuthGate } from "@/components/AuthGate";
import { Navbar } from "@/components/ui/Navbar";
import { StoreProvider } from "@/store/provider";

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
    <html lang="en">
      <body>
        <StoreProvider>
          <AuthGate>
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </main>
          </AuthGate>
        </StoreProvider>
      </body>
    </html>
  );
}
