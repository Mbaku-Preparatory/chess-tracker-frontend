import { GAME_SOURCES } from "@/lib/games";
import type { GameSource, Player } from "@/types";

/**
 * "86 OTB · 10,000 Chess.com · 586 Lichess": a player's games by source, in
 * GAME_SOURCES order. The one row for the player card and the player page.
 * Each count stays on one line with its label, so a long row wraps between
 * sources, never inside one.
 */
export function GameSourceCounts({ counts, className = "" }: { counts: Player["game_source_counts"]; className?: string }) {
  const sources = (Object.keys(GAME_SOURCES) as GameSource[]).filter((s) => (counts?.[s] ?? 0) > 0);
  if (!sources.length) return null;

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      {sources.map((s) => (
        <span key={s} className="inline-flex items-center gap-1 whitespace-nowrap">
          <span className={`h-2 w-2 rounded-full ${GAME_SOURCES[s].dot}`} />
          {counts![s]!.toLocaleString("en")} {GAME_SOURCES[s].short}
        </span>
      ))}
    </span>
  );
}
