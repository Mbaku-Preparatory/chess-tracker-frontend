import { bookPath, fetchPublicBooks } from "@/lib/publicBook";
import { STATIC_PAGES, playerChunk, urlset, xmlResponse } from "@/lib/sitemap";
import { SITE_URL } from "@/lib/site";

// See sitemap.xml/route.ts: on request, cached by the fetch.
export const dynamic = "force-dynamic";

/** /sitemaps/pages.xml, or /sitemaps/players-<n>.xml for chunk n. */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;

  if (file === "pages.xml") {
    // The demo books sit with the static pages: a handful, published by hand.
    const books = await fetchPublicBooks();
    return xmlResponse(
      urlset([
        ...STATIC_PAGES.map((path) => ({ loc: `${SITE_URL}${path}` })),
        ...books.map((b) => ({ loc: `${SITE_URL}${bookPath(b.publicSlug)}`, lastmod: b.finishedAt })),
      ]),
    );
  }

  const match = /^players-(\d{1,4})\.xml$/.exec(file);
  if (!match) return new Response("Not found", { status: 404 });
  const entries = await playerChunk(Number(match[1]));
  // A chunk past the end is a stale link from an old index, not a server
  // error: say so, so a crawler drops it.
  if (!entries.length) return new Response("Not found", { status: 404 });
  return xmlResponse(
    urlset(entries.map((e) => ({ loc: `${SITE_URL}/player/${e.slug}/${e.fideId}`, lastmod: e.lastModified }))),
  );
}
