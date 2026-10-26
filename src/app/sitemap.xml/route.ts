import { playerChunkCount, sitemapIndex, xmlResponse } from "@/lib/sitemap";

// Rendered on request, not at build time: a prerendered index would make every
// frontend deploy depend on the backend answering during the build. The data
// is still cached for a day by the fetch in lib/sitemap.ts.
export const dynamic = "force-dynamic";

/** The sitemap index robots.txt points at: the static pages, then one file
 * per chunk of player profiles. */
export async function GET() {
  const chunks = await playerChunkCount();
  const files = ["/sitemaps/pages.xml", ...Array.from({ length: chunks }, (_, n) => `/sitemaps/players-${n}.xml`)];
  return xmlResponse(sitemapIndex(files));
}
