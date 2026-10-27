/**
 * One public game (a chess-results game on someone's profile), for its own
 * page at /game/<publicId>. Fetched on the server; a played game never
 * changes, so it is cached for a day.
 */

import { BackendUnavailable, type PublicGame } from "./publicPlayer";
import { GRAPHQL_URL } from "./site";

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
  const params = new URLSearchParams({ query: GAME_QUERY, variables: JSON.stringify({ publicId }) });
  let response: Response;
  try {
    response = await fetch(`${GRAPHQL_URL}?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86_400, tags: [`public-game:${publicId}`] },
    });
  } catch (err) {
    throw new BackendUnavailable(String(err));
  }
  if (!response.ok) throw new BackendUnavailable(`GraphQL answered ${response.status}`);
  const body = await response.json();
  if (body.errors?.length) throw new BackendUnavailable(body.errors[0].message);
  return body.data.publicGame;
}
