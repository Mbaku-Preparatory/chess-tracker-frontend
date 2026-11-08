"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { captureAttribution } from "@/lib/attribution";

/**
 * Notes where the visit came from (lib/attribution.ts), once per page load, on
 * every page: most sign-ups start on a public profile, not in the app.
 * Not on /embed, which the Android app loads inside itself: no referrer there,
 * so every one would read as "direct".
 */
export function AttributionCapture() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname.startsWith("/embed")) captureAttribution();
    // The landing page only: later navigations inside the site are not arrivals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
