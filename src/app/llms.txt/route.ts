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

> Public profiles for every FIDE-rated chess player: official FIDE ratings and world and national ranks, monthly rating history, and over-the-board games with results and openings. A chess bot of any FIDE-rated player, built from their games. A chess book reader that opens any chess book PDF on a board, and turns exercise books into puzzles. Accounts add opponent scouting and preparation tools.

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

## Create your own chess bot

- [Create your own chess bot](${SITE_URL}/chess-bot): play a bot of any FIDE-rated player, built from their over-the-board games on chess-results.com. For up to ten moves it plays only moves the player chose in that position, weighted by how often and how recently; after that Stockfish plays at a strength from 1320 to 2900, starting at the player's FIDE rating. It runs in the browser.
- Without an account: one free game. A free account adds unlimited games and bots of the opponents a user scouts.
- Link to a player's bot directly: ${SITE_URL}/chess-bot?fide=<fide-id>. Each player profile links to it.
- Players with no games with moves on chess-results have no bot.

## Chess books

- [Chess books](${SITE_URL}/chess-books): upload a chess book as a PDF (scans included, up to 50 MB, algebraic notation) and read it with a board beside the page: every move and diagram the reader finds opens as a position, lines can be stepped through, and any move can be played from any position and checked with an engine. A book typeset in a chess font becomes its exercises, as puzzles solved on the board.
- The book stays with its owner: the server keeps an index of where moves and diagrams sit, deletes the file, and the reader draws the owner's own copy in their browser. Uploaded books are private to the account.
- Demo books: public-domain books anyone can read without an account, at ${SITE_URL}/book/<slug>. Each carries schema.org Book data. The list is on the chess books page.

## Pages

- [Home](${SITE_URL}/): what the site is, and player search by name or FIDE ID
- [Rankings](${SITE_URL}/rankings): world and per-federation player rankings
- [Create your own chess bot](${SITE_URL}/chess-bot): play a bot of any FIDE-rated player, from their games
- [Chess books](${SITE_URL}/chess-books): the book reader and exercise solver, with demo books
- [Sitemap](${SITE_URL}/sitemap.xml): every active player's profile
- [Privacy policy](${SITE_URL}/privacy)
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
