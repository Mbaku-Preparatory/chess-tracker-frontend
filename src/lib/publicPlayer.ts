/**
 * Public player profiles: the backend's `publicPlayer` query, typed.
 *
 * Fetched on the server, as a GET so Next can cache it. A profile changes at
 * most monthly (FIDE's list) or when a refresh lands, so it is cached for an
 * hour and tagged; the refresh tells Next to drop the tag when it finishes.
 */

import { GRAPHQL_URL } from "./site";

export type RatingPoint = {
  month: string; // YYYY-MM-DD, the first of the list's month
  standardRating: number | null;
  standardGames: number | null;
  rapidRating: number | null;
  rapidGames: number | null;
  blitzRating: number | null;
  blitzGames: number | null;
};

export type ResultCounts = { games: number; wins: number; draws: number; losses: number };

export type PlayerRef = { fideId: string; fullName: string; slug: string; title: string };

export type PublicGame = {
  publicId: string;
  whiteName: string;
  blackName: string;
  whiteElo: number | null;
  blackElo: number | null;
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
  event: string;
  eventCountry: string;
  site: string;
  date: string | null;
  round: string;
  eco: string;
  openingName: string;
  plyCount: number;
  moves: string; // SAN movetext, no headers
  white: PlayerRef | null;
  black: PlayerRef | null;
};

export type PublicPlayer = {
  fideId: string;
  fullName: string;
  slug: string;
  federation: string;
  sex: string;
  title: string;
  womenTitle: string;
  birthYear: number | null;
  isActive: boolean;
  standardRating: number | null;
  rapidRating: number | null;
  blitzRating: number | null;
  standardGames: number;
  rapidGames: number;
  blitzGames: number;
  worldRankStandard: number | null;
  worldRankRapid: number | null;
  worldRankBlitz: number | null;
  nationalRankStandard: number | null;
  nationalRankRapid: number | null;
  nationalRankBlitz: number | null;
  historyFetchedAt: string | null;
  gamesFetchedAt: string | null;
  refreshStatus: "pending" | "running" | null;
  ratingHistory: RatingPoint[];
  stats: ResultCounts & { white: ResultCounts; black: ResultCounts; averageOpponentElo: number | null };
  games: { count: number; results: PublicGame[] };
};

export const GAMES_PAGE_SIZE = 20;

const REF = "fideId fullName slug title";

export const PROFILE_QUERY = `
query PublicProfile($fideId: String!, $page: Int!) {
  publicPlayer(fideId: $fideId) {
    fideId fullName slug federation sex title womenTitle birthYear isActive
    standardRating rapidRating blitzRating standardGames rapidGames blitzGames
    worldRankStandard worldRankRapid worldRankBlitz
    nationalRankStandard nationalRankRapid nationalRankBlitz
    historyFetchedAt gamesFetchedAt refreshStatus
    ratingHistory { month standardRating standardGames rapidRating rapidGames blitzRating blitzGames }
    stats {
      games wins draws losses averageOpponentElo
      white { games wins draws losses }
      black { games wins draws losses }
    }
    games(page: $page, pageSize: ${GAMES_PAGE_SIZE}) {
      count
      results {
        publicId whiteName blackName whiteElo blackElo result event eventCountry
        date round eco openingName plyCount site moves
        white { ${REF} } black { ${REF} }
      }
    }
  }
}`;

export const playerTag = (fideId: string) => `public-player:${fideId}`;

export class BackendUnavailable extends Error {}

/** The profile, or null when FIDE does not rate this ID. Throws
 * BackendUnavailable when the API cannot answer, so the page can say so
 * rather than claim the player does not exist. */
export async function fetchPublicPlayer(fideId: string, page = 1): Promise<PublicPlayer | null> {
  const player = await queryPublicPlayer(fideId, page, { next: { revalidate: 3600, tags: [playerTag(fideId)] } });
  // The data cache cannot tell a profile from "not rated", so a cached null
  // is asked again live: a player the next list or a refresh adds would
  // otherwise 404 for up to an hour.
  return player ?? queryPublicPlayer(fideId, page, { cache: "no-store" });
}

async function queryPublicPlayer(fideId: string, page: number, caching: RequestInit): Promise<PublicPlayer | null> {
  const params = new URLSearchParams({
    query: PROFILE_QUERY,
    variables: JSON.stringify({ fideId, page }),
  });
  let response: Response;
  try {
    response = await fetch(`${GRAPHQL_URL}?${params}`, { headers: { Accept: "application/json" }, ...caching });
  } catch (err) {
    throw new BackendUnavailable(String(err));
  }
  if (!response.ok) throw new BackendUnavailable(`GraphQL answered ${response.status}`);
  const body = await response.json();
  if (body.errors?.length) throw new BackendUnavailable(body.errors[0].message);
  return body.data.publicPlayer;
}

/** "CM Oluka Robert Mcligeyo", the way chess sites and FIDE write a titled name. */
export function titledName(player: { title: string; womenTitle?: string; fullName: string }): string {
  const title = player.title || player.womenTitle;
  return title ? `${title} ${player.fullName}` : player.fullName;
}

export function profilePath(player: { slug: string; fideId: string }): string {
  return `/player/${player.slug}/${player.fideId}`;
}
