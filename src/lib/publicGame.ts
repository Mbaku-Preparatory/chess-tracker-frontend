/**
 * One public game (a chess-results game on someone's profile), for its own
 * page at /game/<publicId>. Fetched on the server; a played game never
 * changes, so it is cached for a day.
 */

import { graphqlGet } from "./publicGraphql";
import type { PublicGame } from "./publicPlayer";

const REF = "fideId fullName slug title";

const GAME_QUERY = `
query PublicGame($publicId: String!) {
  publicGame(publicId: $publicId) {
    publicId whiteName blackName whiteElo blackElo result event eventCountry site
    date round eco openingName plyCount moves
    white { ${REF} } black { ${REF} }
  }
}`;

export const gamePath = (publicId: string) => `/game/${publicId}`;

/** The game, or null when there is no such game. Throws BackendUnavailable
 * when the API cannot answer, so the page can say so rather than 404. */
export async function fetchPublicGame(publicId: string): Promise<PublicGame | null> {
  const data = await graphqlGet<{ publicGame: PublicGame | null }>(GAME_QUERY, { publicId }, {
    next: { revalidate: 86_400, tags: [`public-game:${publicId}`] },
  });
  return data.publicGame;
}
