import type { ImportJob, ImportSource } from "@/types";

const SOURCE_NAMES: Record<ImportSource, string> = {
  chesscom: "Chess.com",
  lichess: "Lichess",
  chess_results: "chess-results",
};

/**
 * Shown on an import panel when another import for the same player is queued
 * or running (useImportJob's `elsewhere`). Imports run one at a time, so a new
 * one waits its turn; saying so is what stops "nothing is happening" and a
 * second click. The panel's button reads "Add to queue" meanwhile.
 */
export function ImportElsewhereNote({ job }: { job: ImportJob }) {
  const state = job.status === "running" ? "is running" : "is queued";
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
      A {SOURCE_NAMES[job.source]} import for this player {state}. Imports run one at a time: add this
      one to the queue and it starts by itself when that one finishes.
    </p>
  );
}
