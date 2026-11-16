"use client";

import { useT } from "@/hooks/useT";
import { msg } from "@/lib/i18n";

import { useGamesStatus, type GamesStatus } from "./refreshState";

/**
 * What the games placeholder says, by where their fetch stands
 * (refreshState.ts). "Fetching…" only while a fetch is running: said before
 * one starts it is what search engines stored, and said after one failed it
 * never stops.
 */
const LABELS: Record<GamesStatus, string> = {
  waiting: msg("Games from chess-results.com have not been loaded for this player yet."),
  fetching: msg("Fetching games from chess-results.com…"),
  unavailable: msg("Games from chess-results.com couldn't be loaded right now."),
};

const PULSE = "animate-pulse motion-reduce:animate-none";

/**
 * Games we do not have yet: the shape of what is coming, and why it is not
 * there. "No games" would read as a fact about the player when it is only a
 * fact about our copy.
 */
export function PendingGames({ rows = 5 }: { rows?: number }) {
  const t = useT();
  const status = useGamesStatus();
  const busy = status === "fetching";
  return (
    <div className="flex flex-col gap-3" aria-busy={busy}>
      <p className="text-[14px] text-ink-faint">{t(LABELS[status])}</p>
      {busy &&
        Array.from({ length: rows }, (_, i) => (
          <div key={i} className={`h-10 rounded-lg bg-ink-raised/60 ${PULSE}`} style={{ opacity: 1 - i * 0.15 }} />
        ))}
    </div>
  );
}
