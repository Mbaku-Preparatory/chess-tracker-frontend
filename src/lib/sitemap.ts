/**
 * Sitemaps for the public site: one index, a file of static pages, and one
 * file per chunk of player profiles (the backend decides the chunk size, kept
 * under Google's 50,000-URL limit).
 *
 * Everything is cached for a day. Profiles appear on the monthly FIDE list,
 * so a sitemap a day old is never meaningfully behind.
 */

import { CURRENT_FEDERATIONS } from "./federations";
import { graphqlGet } from "./publicGraphql";
import { rankingsPath } from "./rankings";
import { SITE_URL } from "./site";

export const SITEMAP_REVALIDATE = 86_400;

// The public pages that are not player profiles. Add new public pages here.
// Each federation's classical list is its own page ("Kenya chess rankings"):
// the searches people make. The other lists are reachable from its tabs.
export const STATIC_PAGES = [
  "/",
  "/rankings",
  "/rankings/countries",
  ...CURRENT_FEDERATIONS.map((f) => rankingsPath({ tc: "classical", list: "overall", fed: f.code, page: 1 })),
  "/chess-bot",
  "/chess-books",
  "/privacy",
];

type Entry = { fideId: string; slug: string; lastModified: string | null };

const graphql = <T,>(query: string, variables: Record<string, unknown> = {}) =>
  graphqlGet<T>(query, variables, { next: { revalidate: SITEMAP_REVALIDATE } });

export async function playerChunkCount(): Promise<number> {
  const data = await graphql<{ publicSitemapChunks: number }>("{ publicSitemapChunks }");
  return data.publicSitemapChunks;
}

export async function playerChunk(chunk: number): Promise<Entry[]> {
  const data = await graphql<{ publicSitemapChunk: Entry[] }>(
    "query($chunk: Int!) { publicSitemapChunk(chunk: $chunk) { fideId slug lastModified } }",
    { chunk },
  );
  return data.publicSitemapChunk;
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

export function urlset(urls: { loc: string; lastmod?: string | null }[]): string {
  const body = urls
    .map(({ loc, lastmod }) =>
      `<url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ""}</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function sitemapIndex(files: string[]): string {
  const body = files.map((f) => `<sitemap><loc>${escapeXml(`${SITE_URL}${f}`)}</loc></sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=3600, s-maxage=${SITEMAP_REVALIDATE}`,
    },
  });
}
