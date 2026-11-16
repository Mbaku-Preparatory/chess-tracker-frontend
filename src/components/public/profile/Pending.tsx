"use client";

import { useT } from "@/hooks/useT";
import { msg } from "@/lib/i18n";

import { usePartStatus, type PartStatus, type ProfilePart } from "./refreshState";

/**
 * What a placeholder says, for each part and where its fetch stands
 * (refreshState.ts). "Fetching…" only while a fetch is running: said before
 * one starts it is what search engines stored, and said after one failed it
 * never stops.
 */
const LABELS: Record<ProfilePart, Record<PartStatus, string>> = {
  history: {
    waiting: msg("Rating history from FIDE has not been loaded for this player yet."),
    fetching: msg("Fetching rating history from FIDE…"),
    unavailable: msg("Rating history from FIDE couldn't be loaded right now."),
  },
  games: {
    waiting: msg("Games from chess-results.com have not been loaded for this player yet."),
    fetching: msg("Fetching games from chess-results.com…"),
    unavailable: msg("Games from chess-results.com couldn't be loaded right now."),
  },
};

const PULSE = "animate-pulse motion-reduce:animate-none";

/**
 * A section whose data we do not have yet: the shape of what is coming, and
 * why it is not there. "No rating history" would read as a fact about the
 * player when it is only a fact about our copy.
 */
export function PendingChart({ part }: { part: ProfilePart }) {
  const t = useT();
  const status = usePartStatus(part);
  const busy = status === "fetching";
  return (
    <div className="flex flex-col gap-4" aria-busy={busy}>
      <div className={`h-7 w-48 rounded-pill bg-ink-raised ${busy ? PULSE : ""}`} />
      <div className="relative h-[200px] overflow-hidden rounded-lg bg-ink-raised/40 sm:h-[240px]">
        {busy && <div className={`absolute inset-0 bg-gradient-to-t from-ink-raised/70 to-transparent ${PULSE}`} />}
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[14px] text-ink-faint">{t(LABELS[part][status])}</p>
      </div>
    </div>
  );
}

export function PendingRows({ part, rows = 5 }: { part: ProfilePart; rows?: number }) {
  const t = useT();
  const status = usePartStatus(part);
  const busy = status === "fetching";
  return (
    <div className="flex flex-col gap-3" aria-busy={busy}>
      <p className="text-[14px] text-ink-faint">{t(LABELS[part][status])}</p>
      {busy &&
        Array.from({ length: rows }, (_, i) => (
          <div key={i} className={`h-10 rounded-lg bg-ink-raised/60 ${PULSE}`} style={{ opacity: 1 - i * 0.15 }} />
        ))}
    </div>
  );
}
