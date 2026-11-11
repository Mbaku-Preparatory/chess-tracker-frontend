/**
 * Google AdSense: ads on the public pages only, and only for visitors who are
 * not signed in. The signed-in app, the Android app and its embedded pages
 * never show ads, and "no ads" is one more reason to make an account.
 *
 * Where ads go is decided by where <AdSlot /> is placed
 * (components/public/AdSlot.tsx); there are no Auto ads, which scatter ads
 * across the page and slow it down.
 */

/** The AdSense publisher ID. Public by design: it is in every ad's HTML. */
export const ADSENSE_CLIENT = "ca-pub-5427608436888723";

/** Google's ad script. AdSlot loads it; NoAdsInApp checks for it. */
export const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

/**
 * The display ad unit, made in AdSense → Ads → By ad unit (a responsive
 * "Display ad"); every placement reuses it. Null until AdSense has approved
 * the site: while it is null, no ad renders and the AdSense script is never
 * loaded, so nothing reaches Google from visitors yet.
 */
export const AD_SLOT: string | null = null;
