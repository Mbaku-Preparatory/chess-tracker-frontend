"use client";

import { useEffect } from "react";

import { ADSENSE_SCRIPT_SRC } from "@/lib/ads";

/**
 * Keeps the signed-in app ad-free (see lib/ads.ts).
 *
 * AdSlot shows ads only on public pages, but Google's script, once loaded,
 * stays in the tab across client-side navigation. A signed-out visitor who
 * clicks "Prepare against" on a profile arrives at /prepare and then /signup
 * with it still running. Fixed ad units show nothing there, but the script can
 * place ads on any page it is running on (Auto ads, if anyone switches them on
 * in AdSense) and shows Google's consent message. A full reload is the only
 * way to unload it, so the app reloads once when it finds the script. After
 * the reload the script is gone, so it never reloads twice.
 */
export function NoAdsInApp() {
  useEffect(() => {
    if (document.querySelector(`script[src="${ADSENSE_SCRIPT_SRC}"]`)) window.location.reload();
  }, []);
  return null;
}
