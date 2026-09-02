"use client";

import type { ImportJob } from "@/types";
import { isTerminal } from "./useImportJob";

/**
 * What a queued import looks like while it runs and once it settles.
 *
 * Shared by the Chess.com and Lichess panels, which each queue exactly one
 * entry, so "the job" and "the import" are the same thing here and the
 * per-entry results array has at most one row.
 */
export function ImportJobProgress({
  job,
  onCancel,
  runningLabel,
}: {
  job: ImportJob | null;
  onCancel: () => void;
  runningLabel: string;
}) {
  if (!job) return null;

  const entry = job.results?.[0];

  if (!isTerminal(job)) {
    return (
      <div className="mt-4 space-y-2 rounded-lg border border-brand-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>
              {job.queue_ahead != null && job.queue_ahead > 0
                ? `Waiting behind ${job.queue_ahead} other import${job.queue_ahead !== 1 ? "s" : ""}…`
                : runningLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={job.cancel_requested}
            className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            {job.cancel_requested ? "Cancelling…" : "Cancel"}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          This runs on the server — you can close this page and come back to it.
        </p>
      </div>
    );
  }

  if (job.status === "succeeded") {
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800">
          <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-semibold">
            {job.games_imported} game{job.games_imported !== 1 ? "s" : ""} imported successfully
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {entry?.games_skipped ? (
            <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-gray-500">
              {entry.games_skipped} game{entry.games_skipped !== 1 ? "s" : ""} skipped
            </span>
          ) : null}
          {entry?.skipped_reason === "no_games" && (
            <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-amber-700">
              No public standard games found
            </span>
          )}
        </div>
      </div>
    );
  }

  if (job.status === "cancelled") {
    return (
      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Import cancelled.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {entry?.message || "The import failed. You can try again."}
    </div>
  );
}
