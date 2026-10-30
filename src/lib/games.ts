/**
 * How a game is labelled wherever it is shown: its source and its date.
 * One place, so the games table, the prep panel and the filters agree.
 */

import type { GameSource } from "@/types";

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
