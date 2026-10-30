/**
 * Player rankings: the backend's `publicRankings` query, typed, and the
 * /rankings URL scheme.
 *
 * One URL per list, so every list is a page a search engine can index:
 * /rankings?tc=rapid&list=women&fed=KEN&page=2. Defaults are left out, so the
 * world classical list is plain /rankings and each list has exactly one URL.
 *
 * Fetched on the server as a GET, cached for an hour like profiles: the
 * rankings change only when the monthly FIDE list is imported.
 */

import { FEDERATIONS } from "./federations";
import { graphqlGet } from "./publicGraphql";

export const TIME_CONTROLS = [
  { key: "classical", label: "Classical", api: "STANDARD" },
  { key: "rapid", label: "Rapid", api: "RAPID" },
  { key: "blitz", label: "Blitz", api: "BLITZ" },
] as const;

export const LISTS = [
  { key: "overall", label: "Overall", api: "OVERALL", phrase: "" },
  { key: "women", label: "Women", api: "WOMEN", phrase: "women's" },
  { key: "juniors", label: "Juniors", api: "JUNIORS", phrase: "junior" },
  { key: "girls", label: "Girls", api: "GIRLS", phrase: "girls'" },
] as const;

export type TimeControlKey = (typeof TIME_CONTROLS)[number]["key"];
export type ListKey = (typeof LISTS)[number]["key"];

export const RANKINGS_PAGE_SIZE = 50;

export type RankingsView = { tc: TimeControlKey; list: ListKey; fed: string; page: number };

export type RankedPlayer = {
  fideId: string;
  fullName: string;
  slug: string;
  federation: string;
  title: string;
  womenTitle: string;
};

export type RankingEntry = { rank: number; rating: number; birthYear: number | null; player: RankedPlayer };

export type Rankings = { count: number; results: RankingEntry[] };

type Params = { tc?: string | string[]; list?: string | string[]; fed?: string | string[]; page?: string | string[] };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const FEDERATION_CODES = new Set(FEDERATIONS.map((f) => f.code));

/** The list a URL asks for. Anything unrecognised falls back to the default
 * rather than erroring: an old or hand-typed link still shows a list, and its
 * canonical is that list's one URL, not a page per made-up country code. */
export function parseView(params: Params): RankingsView {
  const tc = TIME_CONTROLS.find((t) => t.key === first(params.tc))?.key ?? "classical";
  const list = LISTS.find((l) => l.key === first(params.list))?.key ?? "overall";
  const code = first(params.fed).toUpperCase();
  const fed = FEDERATION_CODES.has(code) ? code : "";
  const page = Number(first(params.page) || 1);
  return { tc, list, fed, page: Number.isInteger(page) && page > 0 ? page : 1 };
}

/** The one URL for a list, defaults left out, in a fixed order. */
export function rankingsPath(view: RankingsView): string {
  const q = new URLSearchParams();
  if (view.tc !== "classical") q.set("tc", view.tc);
  if (view.list !== "overall") q.set("list", view.list);
  if (view.fed) q.set("fed", view.fed);
  if (view.page > 1) q.set("page", String(view.page));
  const qs = q.toString();
  return qs ? `/rankings?${qs}` : "/rankings";
}

const RANKINGS_QUERY = `
query Rankings($tc: RankingTimeControl!, $list: RankingCategory!, $fed: String!, $page: Int!) {
  publicRankings(timeControl: $tc, category: $list, federation: $fed, page: $page, pageSize: ${RANKINGS_PAGE_SIZE}) {
    count
    results { rank rating birthYear player { fideId fullName slug federation title womenTitle } }
  }
}`;

export async function fetchRankings(view: RankingsView): Promise<Rankings> {
  const variables = {
    tc: TIME_CONTROLS.find((t) => t.key === view.tc)!.api,
    list: LISTS.find((l) => l.key === view.list)!.api,
    fed: view.fed,
    page: view.page,
  };
  const data = await graphqlGet<{ publicRankings: Rankings }>(RANKINGS_QUERY, variables, {
    next: { revalidate: 3600, tags: ["rankings"] },
  });
  return data.publicRankings;
}
