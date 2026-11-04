/**
 * Public player profiles: the backend's `publicPlayer` query, typed.
 *
 * Fetched on the server, as a GET so Next can cache it. A profile changes at
 * most monthly (FIDE's list) or when a refresh lands, so it is cached for a
 * week and tagged; the refresh tells Next to drop the tag when it finishes.
 */

import { graphqlGet, graphqlPost } from "./publicGraphql";

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

const REF = "fideId fullName slug title";

const GAME_FIELDS = `
  publicId whiteName blackName whiteElo blackElo result event eventCountry
  date round eco openingName plyCount site moves
  white { ${REF} } black { ${REF} }`;

export const PROFILE_QUERY = `
query PublicProfile($fideId: String!, $page: Int!, $pageSize: Int!) {
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
    games(page: $page, pageSize: $pageSize) { count results { ${GAME_FIELDS} } }
  }
}`;

export const playerTag = (fideId: string) => `public-player:${fideId}`;

/**
 * How long a rendered profile is kept, in seconds. The profile page is cached
 * whole (HTML on Vercel's CDN), so a crawler or a second visitor costs no
 * server render, and this fetch's lifetime is the page's: Next keeps a page no
 * longer than the shortest-lived fetch on it.
 *
 * A week, because the data moves monthly. A refresh landing drops the page at
 * once (revalidatePlayer); a new monthly FIDE list shows within a week.
 */
export const PROFILE_REVALIDATE = 7 * 24 * 60 * 60;

/** The profile, or null when FIDE does not rate this ID. Throws
 * BackendUnavailable when the API cannot answer, so the page can say so
 * rather than claim the player does not exist (an error is never cached).
 *
 * A null is cached like a profile: a page that is kept cannot make an uncached
 * request (that would turn it back into a render per visit). So an ID opened
 * before FIDE's list had it 404s until the week is out. Rare: nothing links
 * to a player who is not on the list yet. */
export async function fetchPublicPlayer(fideId: string, page: number, pageSize: number): Promise<PublicPlayer | null> {
  const data = await graphqlGet<{ publicPlayer: PublicPlayer | null }>(PROFILE_QUERY, { fideId, page, pageSize }, {
    next: { revalidate: PROFILE_REVALIDATE, tags: [playerTag(fideId)] },
  });
  return data.publicPlayer;
}

const GAMES_QUERY = `
query PublicGames($fideId: String!, $page: Int!, $pageSize: Int!) {
  publicPlayer(fideId: $fideId) { games(page: $page, pageSize: $pageSize) { count results { ${GAME_FIELDS} } } }
}`;

/** One page of a profile's games, from the browser: the games table fetches
 * the blocks after the one the server rendered. */
export async function fetchPublicGames(fideId: string, page: number, pageSize: number): Promise<PublicPlayer["games"]> {
  const data = await graphqlPost<{ publicPlayer: { games: PublicPlayer["games"] } | null }>(GAMES_QUERY, { fideId, page, pageSize });
  return data.publicPlayer?.games ?? { count: 0, results: [] };
}

/** "CM Oluka Robert Mcligeyo", the way chess sites and FIDE write a titled name. */
export function titledName(player: { title: string; womenTitle?: string; fullName: string }): string {
  const title = player.title || player.womenTitle;
  return title ? `${title} ${player.fullName}` : player.fullName;
}

export function profilePath(player: { slug: string; fideId: string }): string {
  return `/player/${player.slug}/${player.fideId}`;
}
