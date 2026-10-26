/**
 * Sitemaps for the public site: one index, a file of static pages, and one
 * file per chunk of player profiles (the backend decides the chunk size, kept
 * under Google's 50,000-URL limit).
 *
 * Everything is cached for a day. Profiles appear on the monthly FIDE list,
 * so a sitemap a day old is never meaningfully behind.
 */

import { GRAPHQL_URL, SITE_URL } from "./site";

export const SITEMAP_REVALIDATE = 86_400;

// The public pages that are not player profiles. Add new public pages here.
export const STATIC_PAGES = ["/", "/privacy"];

type Entry = { fideId: string; slug: string; lastModified: string | null };

async function graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const params = new URLSearchParams({ query, variables: JSON.stringify(variables) });
  const response = await fetch(`${GRAPHQL_URL}?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: SITEMAP_REVALIDATE },
  });
  if (!response.ok) throw new Error(`GraphQL answered ${response.status}`);
  const body = await response.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  return body.data;
}

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
