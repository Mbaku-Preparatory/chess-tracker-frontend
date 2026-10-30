/**
 * How a game is shown wherever it is listed: its source, its date, the games
 * table's row and its page sizes. One place, so the app and the public site
 * agree.
 */

import type { Game, GameSource } from "@/types";

import { gameRef } from "./gameRef";
import { gamePath } from "./publicGame";
import { profilePath, type PlayerRef, type PublicGame } from "./publicPlayer";

export const GAME_SOURCES: Record<GameSource, { label: string; short: string; dot: string }> = {
  chess_results: { label: "Chess-Results (OTB)", short: "OTB", dot: "bg-amber-500" },
  chess_com: { label: "Chess.com", short: "Chess.com", dot: "bg-emerald-500" },
  lichess: { label: "Lichess", short: "Lichess", dot: "bg-violet-500" },
  pgn_import: { label: "PGN import", short: "PGN", dot: "bg-blue-400" },
  manual: { label: "Manual", short: "Manual", dot: "bg-gray-400" },
};

/** A source the backend added after this list: shown as it comes. */
export function gameSource(source: string): { label: string; short: string; dot: string } {
  return GAME_SOURCES[source as GameSource] ?? { label: source, short: source, dot: "bg-gray-400" };
}

/** "5 Mar 2025" (or "5 March 2025"). A game date has no time of day, so it is
 * read as UTC: in local time it would show the day before west of Greenwich. */
export function formatGameDate(date: string | null | undefined, month: "short" | "long" = "short"): string | null {
  if (!date) return null;
  return new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month, year: "numeric", timeZone: "UTC" });
}

/** The games table's page sizes; the first is the default. The backend caps a page at 100. */
export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE: number = PAGE_SIZES[0];

/** A page size from a URL or a picker: one of PAGE_SIZES, else the default. */
export function pageSizeOf(value: unknown): number {
  const n = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

/** "/player/x/123?page=2&size=20#games": the first page and the default size
 * are left out, so each page has one URL. */
export function pagedHref(basePath: string, page: number, pageSize: number, anchor?: string): string {
  const query = new URLSearchParams();
  if (page > 1) query.set("page", String(page));
  if (pageSize !== DEFAULT_PAGE_SIZE) query.set("size", String(pageSize));
  const qs = query.toString();
  return `${basePath}${qs ? `?${qs}` : ""}${anchor ? `#${anchor}` : ""}`;
}

/** One side of a game, as the table shows it. */
export interface GameSide {
  name: string;
  elo: number | null;
  /** Their profile; null when there is none, or for the player the list is about. */
  href: string | null;
  /** The player the list is about: their name is set apart. */
  self: boolean;
}

/** A game as the games table shows it, from a scouted game or a public one. */
export interface GameRow {
  key: string;
  /** Its viewer; null when there are no moves to show. */
  href: string | null;
  date: string | null;
  white: GameSide;
  black: GameSide;
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
  /** The result from the player's side, for the coloured marker. */
  outcome: "win" | "draw" | "loss" | null;
  event: string;
  round: string | null;
  opening: string | null;
}

/** A chess-results game on a public profile. `fideId` is whose profile it is. */
export function rowFromPublicGame(g: PublicGame, fideId: string): GameRow {
  const side = (name: string, elo: number | null, ref: PlayerRef | null): GameSide => ({
    name,
    elo,
    href: ref && ref.fideId !== fideId ? profilePath(ref) : null,
    self: ref?.fideId === fideId,
  });
  const asWhite = g.white?.fideId === fideId;
  const outcome =
    g.result === "1/2-1/2" ? "draw" : g.result === "*" ? null : asWhite === (g.result === "1-0") ? "win" : "loss";
  return {
    key: g.publicId,
    href: g.plyCount > 0 && g.moves.length > 0 ? gamePath(g.publicId) : null,
    date: g.date,
    white: side(g.whiteName, g.whiteElo, g.white),
    black: side(g.blackName, g.blackElo, g.black),
    result: g.result,
    outcome,
    event: g.event,
    round: g.round || null,
    opening: g.openingName || null,
  };
}

const RESULT_TAG = {
  white: { win: "1-0", loss: "0-1", draw: "1/2-1/2" },
  black: { win: "0-1", loss: "1-0", draw: "1/2-1/2" },
} as const;

/** A scouted player's game: its result is from their side, so it needs their
 * colour to read. Their own rating is left out: the game does not store what
 * it was then, and today's would mislead on an old game. */
export function rowFromGame(g: Game, playerName: string): GameRow {
  const me: GameSide = { name: playerName, elo: null, href: null, self: true };
  const them: GameSide = { name: g.opponent_name, elo: g.opponent_rating, href: null, self: false };
  return {
    key: gameRef(g),
    href: `/games/${gameRef(g)}`,
    date: g.date_played,
    white: g.color_played === "white" ? me : them,
    black: g.color_played === "white" ? them : me,
    result: RESULT_TAG[g.color_played]?.[g.result] ?? "*",
    outcome: g.result ?? null,
    event: g.event,
    round: g.round || null,
    opening: g.opening_name,
  };
}
