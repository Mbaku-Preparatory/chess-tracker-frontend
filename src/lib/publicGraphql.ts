/**
 * The public GraphQL API: the queries anyone can ask, with no session.
 * (Signed-in calls go through api/graphqlClient.ts, which adds the token.)
 *
 * Two ways in, one for each side:
 * - graphqlGet, on the server: a GET, so Next's data cache can keep the
 *   answer (pass `next: { revalidate, tags }`).
 * - graphqlPost, in the browser: mutations, and reads that count against the
 *   visitor's own IP rather than the server's.
 */

import { GRAPHQL_URL } from "./site";

/** The API could not answer. A page says so rather than 404. */
export class BackendUnavailable extends Error {}

type Variables = Record<string, unknown>;

const GENERIC = "Something went wrong. Try again in a moment.";

export async function graphqlGet<T>(query: string, variables: Variables = {}, init: RequestInit = {}): Promise<T> {
  const params = new URLSearchParams({ query, variables: JSON.stringify(variables) });
  let response: Response;
  try {
    response = await fetch(`${GRAPHQL_URL}?${params}`, { headers: { Accept: "application/json" }, ...init });
  } catch (err) {
    throw new BackendUnavailable(String(err));
  }
  if (!response.ok) throw new BackendUnavailable(`GraphQL answered ${response.status}`);
  const body = await response.json();
  if (body.errors?.length) throw new BackendUnavailable(body.errors[0].message);
  return body.data;
}

/** Throws an Error whose message can be shown: the API's own, or a generic one. */
export async function graphqlPost<T>(query: string, variables: Variables = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error(GENERIC);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || body.errors?.length) throw new Error(body?.errors?.[0]?.message ?? GENERIC);
  return body.data as T;
}

export type PlayerSearchResult = {
  fideId: string;
  fullName: string;
  slug: string;
  title: string;
  womenTitle: string;
  federation: string;
  standardRating: number | null;
  rapidRating: number | null;
  blitzRating: number | null;
};

const SEARCH = `query Search($q: String!, $limit: Int!) {
  searchPublicPlayers(query: $q, limit: $limit) {
    fideId fullName slug title womenTitle federation standardRating rapidRating blitzRating
  }
}`;

/** Players on FIDE's rating list by name or FIDE ID, from our own copy of the
 * list: no request reaches FIDE or chess-results. */
export async function searchPublicPlayers(q: string, limit = 8): Promise<PlayerSearchResult[]> {
  return (await graphqlPost<{ searchPublicPlayers: PlayerSearchResult[] }>(SEARCH, { q, limit })).searchPublicPlayers;
}
