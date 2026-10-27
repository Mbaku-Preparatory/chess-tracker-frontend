import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/**
 * /llms.txt: a plain description of the site for language-model crawlers and
 * answer engines (llmstxt.org). Says what the pages are, where the data comes
 * from, and how profile URLs are built, so an assistant can cite a profile
 * rather than guess at one.
 */
export function GET() {
  const text = `# Chess Preparatory

> Public profiles for every FIDE-rated chess player: official FIDE ratings and world and national ranks, monthly rating history, and over-the-board games with results and openings. Accounts add opponent scouting and preparation tools.

## Player profiles

- URL pattern: ${SITE_URL}/player/<name-slug>/<fide-id>. The FIDE ID is the address; a wrong name slug redirects to the right one.
- Ratings, titles and ranks come from FIDE's official rating list, published monthly. Ranks count active players only, as FIDE's rankings do.
- Rating history is FIDE's monthly list history for the player.
- Games come from chess-results.com, for tournaments whose organisers uploaded the moves. A player's game count can be lower than the games FIDE rated.
- Each profile carries schema.org ProfilePage and Person data, including the FIDE ID.

## Rankings

- [World rankings](${SITE_URL}/rankings): FIDE's ranking of active players, from the latest monthly list, 50 per page.
- Query parameters: tc=classical|rapid|blitz (default classical), list=overall|women|juniors|girls (default overall), fed=<FIDE federation code, e.g. KEN> (default the world), page=<n>.
- Juniors and girls are players under 20 on 1 January. Tied ratings share a rank. Overall world and federation ranks match the ranks shown on each profile.

## Pages

- [Home](${SITE_URL}/): what the site is, and player search by name or FIDE ID
- [Rankings](${SITE_URL}/rankings): world and per-federation player rankings
- [Sitemap](${SITE_URL}/sitemap.xml): every active player's profile
- [Privacy policy](${SITE_URL}/privacy)
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
