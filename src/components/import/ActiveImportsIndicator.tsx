"use client";

/**
 * The "an import is running" pill, fixed to the bottom-right on every page.
 *
 * Without this, telling someone they can leave the import page means the
 * import vanishes the moment they take you up on it.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveImports } from "./ActiveImportsProvider";

const PAWN_CELLS = 10;

export function ActiveImportsIndicator() {
  const { jobs } = useActiveImports();
  const pathname = usePathname();

  // The import page already shows the full picture; a floating pill on top of
  // it would just be a second, smaller copy of the same numbers.
  if (jobs.length === 0 || pathname?.endsWith("/import")) return null;

  const completed = jobs.reduce((sum, j) => sum + j.completed, 0);
  const total = jobs.reduce((sum, j) => sum + j.total, 0);
  const games = jobs.reduce((sum, j) => sum + j.games_imported, 0);
  const filled = total === 0 ? 0 : Math.round((completed / total) * PAWN_CELLS);

  const single = jobs.length === 1 ? jobs[0] : null;
  const ahead = single?.queue_ahead ?? 0;
  const href = single
    ? `/players/${single.player_slug}/import?source=chess_results`
    : "/home";
  const label = single ? single.player_name : `${jobs.length} imports`;
  const queued = jobs.every((j) => j.status === "pending" && j.completed === 0);

  return (
    <Link
      href={href}
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-gray-200 bg-white/95 py-2.5 pl-4 pr-5 shadow-lg backdrop-blur transition hover:border-[#1a3a6b]/40 hover:shadow-xl dark:border-dark-border dark:bg-dark-surface/95"
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: PAWN_CELLS }, (_, i) => (
          <span
            key={i}
            style={i < filled ? undefined : { animationDelay: `${i * 0.08}s` }}
            className={`text-sm leading-none transition-colors duration-300 ${
              i < filled
                ? "text-[#1a3a6b] dark:text-blue-400"
                : "pawn-wave text-[#1a3a6b]/60 dark:text-blue-400/60"
            }`}
          >
            ♟
          </span>
        ))}
      </span>

      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
          {queued ? "Import queued" : `Importing ${label}`}
        </span>
        <span className="block text-xs tabular-nums text-gray-500 dark:text-gray-400">
          {queued
            ? ahead > 0
              ? `${ahead} ahead of yours`
              : "starting…"
            : `${completed} of ${total} · ${games} games`}
        </span>
      </span>
    </Link>
  );
}
