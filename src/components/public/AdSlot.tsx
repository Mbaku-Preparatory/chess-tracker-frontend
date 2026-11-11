"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

import { useSignedIn } from "@/hooks/useSignedIn";
import { ADSENSE_CLIENT, ADSENSE_SCRIPT_SRC, AD_SLOT } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * One responsive display ad, for public pages only (see lib/ads.ts).
 *
 * Shown only once the client knows the visitor is signed out: the session is
 * in localStorage, so the server renders nothing here and the ad appears after
 * hydration. That appearance moves whatever is below it, so place this below
 * the first screen, where the move does not count against Core Web Vitals
 * (layout shift is measured only for content in view).
 *
 * The AdSense script loads here rather than in a layout, so a page without a
 * slot (the landing page, pricing, the fun pages) never downloads it. Once
 * loaded it stays for the life of the tab; NoAdsInApp clears it when the
 * visitor moves on into the signed-in app.
 */
export function AdSlot() {
  const signedIn = useSignedIn();
  const show = AD_SLOT !== null && signedIn === false;
  // React runs effects twice in development; a second push on the same <ins>
  // throws "All ins elements already have ads".
  const pushed = useRef(false);

  useEffect(() => {
    if (!show) {
      pushed.current = false;
      return;
    }
    if (pushed.current) return;
    pushed.current = true;
    try {
      // Queued until the script arrives, which then fills this <ins>.
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // An ad blocker, or the script failed: the page works without the ad.
    }
  }, [show]);

  if (!show) return null;
  return (
    // Hidden when Google has no ad to fill it with, so no empty labelled box is left.
    <aside aria-label="Advertisement" className="flex flex-col gap-1 has-[[data-ad-status=unfilled]]:hidden">
      <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">Advertisement</p>
      {/* next/script loads one copy however many slots a page has (same id). */}
      <Script
        id="adsbygoogle"
        src={ADSENSE_SCRIPT_SRC}
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      <ins
        className="adsbygoogle block"
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={AD_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
