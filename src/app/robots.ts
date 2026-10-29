import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * Crawl the public site; leave the signed-in app alone. Those pages render
 * nothing without a session, so a crawler would only find login redirects.
 * "/players" (the app's scouting list) is not "/player" (public profiles):
 * robots rules match by prefix, and "/player/…" does not start with "/players".
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/home", "/players", "/me", "/support", "/verify-email",
        // A signed-in user's games and the master corpus. "/games" is not
        // "/game/…", the public game pages, for the same prefix reason.
        "/games", "/master-games", "/books",
        "/api/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
