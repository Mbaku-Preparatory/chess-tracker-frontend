import type { Metadata } from "next";

import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Pages the phone app shows inside its WebView: the signed-in app without the
 * site's navigation, since the app has its own. The app puts its session into
 * localStorage before the page loads (chess-tracker-mobile, BookReaderWeb), so
 * AuthGate lets it straight in.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <main className="mx-auto max-w-7xl px-3 py-3">{children}</main>
    </AuthGate>
  );
}
