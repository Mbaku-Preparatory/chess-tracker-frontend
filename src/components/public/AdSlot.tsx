"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { useSignedIn } from "@/hooks/useSignedIn";
import { ADSENSE_CLIENT, ADSENSE_SCRIPT_SRC, AD_SLOT } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * One display ad, for public pages only and never for a signed-in visitor
 * (see lib/ads.ts).
 *
 * Its space is fixed (AD_HEIGHT) and in the server's HTML, so the ad fills it
 * without moving the page: it can sit high up without costing layout shift in
 * Core Web Vitals. The server cannot tell who is signed in (the session is in
 * localStorage), so a signed-in browser hides the space with CSS before the
 * first paint (SIGNED_IN_SCRIPT, lib/auth.ts), and this renders nothing once
 * React has looked.
 *
 * The AdSense script loads here rather than in a layout, so a page without a
 * slot (the landing page, pricing, the fun pages) never downloads it. Once
 * loaded it stays for the life of the tab; NoAdsInApp clears it when the
 * visitor moves on into the signed-in app.
 */

// 280px fits Google's common sizes: 336×280 and 300×250 on a phone, 970×250
// or 728×90 on a desktop. A fixed height (no data-ad-format="auto") is what
// lets the space be reserved: an auto ad picks its own height after loading.
const AD_HEIGHT = "h-[280px]";

export function AdSlot() {
  const signedIn = useSignedIn();
  // The script was blocked (an ad blocker) or failed: drop the empty space.
  const [failed, setFailed] = useState(false);
  // React runs effects twice in development; a second push on the same <ins>
  // throws "All ins elements already have ads".
  const pushed = useRef(false);

  useEffect(() => {
    if (AD_SLOT === null || signedIn !== false) {
      pushed.current = false;
      return;
    }
    if (pushed.current) return;
    pushed.current = true;
    try {
      // Queued until the script arrives, which then fills this <ins>.
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // The page works without the ad.
    }
  }, [signedIn]);

  // Null (not yet known) still renders: that is the server's HTML, the space
  // that keeps the page from moving. Only a known signed-in visitor gets nothing.
  if (AD_SLOT === null || signedIn === true || failed) return null;
  return (
    // Hidden when Google has no ad to fill it with, so no empty labelled box is left.
    <aside aria-label="Advertisement" data-ad-space className="flex flex-col gap-1 has-[[data-ad-status=unfilled]]:hidden">
      <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">Advertisement</p>
      {signedIn === false && (
        // next/script loads one copy however many slots a page has (same id).
        <Script
          id="adsbygoogle"
          src={ADSENSE_SCRIPT_SRC}
          strategy="afterInteractive"
          crossOrigin="anonymous"
          onError={() => setFailed(true)}
        />
      )}
      <ins className={`adsbygoogle block w-full ${AD_HEIGHT}`} data-ad-client={ADSENSE_CLIENT} data-ad-slot={AD_SLOT} />
    </aside>
  );
}
