/**
 * Where the site and its API live, for code that runs on the server as well as
 * in the browser.
 */

// The public origin, for canonical URLs, sitemaps and structured data. Set
// NEXT_PUBLIC_SITE_URL on preview deployments so they do not claim to be
// production.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://chesspreparatory.com").replace(/\/$/, "");

// The link preview from app/opengraph-image.tsx. A page that sets its own
// openGraph replaces the inherited one whole, image included, so every page
// that does has to name it again.
export const SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Chess Preparatory" };

// The same fallback chain as lib/api.ts, so a deployment that sets only
// NEXT_PUBLIC_API_URL reaches the same backend from both.
const rawApiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const BACKEND_ORIGIN = rawApiBase.replace(/\/$/, "").replace(/\/api$/, "");
export const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_API || `${BACKEND_ORIGIN}/graphql/`;
