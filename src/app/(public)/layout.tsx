import type { Metadata } from "next";

import { PublicShell } from "@/components/public/PublicShell";
import { ADSENSE_CLIENT } from "@/lib/ads";

// AdSense's site-ownership check reads this tag from the HTML; it loads
// nothing. The ads themselves come from <AdSlot /> (see lib/ads.ts).
export const metadata: Metadata = {
  other: { "google-adsense-account": ADSENSE_CLIENT },
};

/**
 * Pages anyone can read, signed in or not: player profiles, and the landing
 * page. Server-rendered, so a crawler gets the content in the HTML, and
 * outside AuthGate, so nobody is sent to /login to read them.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
