"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ImportJob } from "@/types";
import { userMessage } from "@/lib/apiError";
import { searchPublicPlayers, type PlayerSearchResult } from "@/lib/publicGraphql";
import { useActiveImports } from "./ActiveImportsProvider";
import { NotifyMeCheckbox } from "@/components/ui/NotifyMeCheckbox";
import { usePreferences } from "@/components/PreferencesProvider";

interface ChessResultsImportSectionProps {
  slug: string;
  playerRef: string;
  fideId?: string | null;
  // Called once when an import finishes successfully.
  onSuccess?: () => void;
}

const POLL_INTERVAL_MS = 2000;

function isTerminal(job: ImportJob): boolean {
  return job.status === "succeeded" || job.status === "failed" || job.status === "cancelled";
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Imports every game chess-results has for one FIDE ID.
 *
 * chess-results' game search returns a whole career in one export, so there
 * is nothing to choose: the player's FIDE ID is the whole input. A player
 * without one on file can be looked up by name on FIDE's rating list.
 */
export function ChessResultsImportSection({
  slug,
  playerRef,
  fideId,
  onSuccess,
}: ChessResultsImportSectionProps) {
  // The profile already knows who this is — don't offer to import someone else.
  const knownFideId = fideId?.trim() || "";

  const [job, setJob] = useState<ImportJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [fideInput, setFideInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [candidates, setCandidates] = useState<PlayerSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  // Starts as the settings page says; the box still changes it for this one.
  const { preferences, loaded: preferencesLoaded } = usePreferences();
  const [notifyEmail, setNotifyEmail] = useState(preferences.import_emails);
  useEffect(() => {
    if (preferencesLoaded) setNotifyEmail(preferences.import_emails);
  }, [preferencesLoaded, preferences.import_emails]);

  // The app-shell pill polls on its own timer; nudging it means starting or
  // cancelling an import shows up there immediately rather than up to 3s late.
  const { refresh: refreshActiveImports } = useActiveImports();

  // onSuccess is called once when a job completes; keeping it in a ref means
  // the polling effect doesn't restart every time the parent re-renders.
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const refreshRef = useRef(refreshActiveImports);
  refreshRef.current = refreshActiveImports;

  const activeJobId = job && !isTerminal(job) ? job.id : null;

  // ── Reconnect to an import already in progress ──────────────────────────────
  //
  // A coach can close the tab mid-import, come back, and still see it running.
  // Nothing in component state survives that, so on mount we ask whether this
  // player has a live job.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { results } = await api.recentImportJobs(slug);
        const live = results.find((j) => !isTerminal(j));
        if (live && !cancelled) setJob((current) => current ?? live);
      } catch {
        // Not being able to check is not worth interrupting anyone over —
        // they can still start a new import.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ── Poll a running job ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeJobId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const next = await api.getImportJob(activeJobId);
        if (cancelled) return;
        setJob(next);
        if (isTerminal(next)) {
          if (next.status === "succeeded") onSuccessRef.current?.();
          refreshRef.current();
          return; // stop polling
        }
      } catch (err) {
        if (cancelled) return;
        // A failed poll is usually a blip. Keep polling rather than declaring
        // the import dead — the job itself is unaffected by our connection.
        console.error("[import] poll failed", err);
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeJobId]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function startImport(id: string) {
    setError(null);
    setJobError(null);
    setStarting(true);
    try {
      setJob(await api.createCareerImportJob(slug, id, notifyEmail));
      refreshActiveImports();
    } catch (err) {
      setError(userMessage(err, "Could not start the import."));
    } finally {
      setStarting(false);
    }
  }

  async function handleNameSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setError(null);
    setSearching(true);
    try {
      const found = await searchPublicPlayers(nameInput.trim());
      setCandidates(found);
      if (found.length === 0) setError("No rated players found with that name.");
    } catch (err) {
      setError(userMessage(err, "Search failed. Try again."));
    } finally {
      setSearching(false);
    }
  }

  async function handleCancelImport(jobId: string) {
    try {
      setJob(await api.cancelImportJob(jobId));
      refreshActiveImports();
    } catch (err) {
      setJobError(userMessage(err, "Could not cancel the import."));
    }
  }

  const inputClass =
    "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1a3a6b] focus:outline-none focus:ring-1 focus:ring-[#1a3a6b] dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500";
  const buttonClass =
    "inline-flex items-center gap-2 rounded-lg bg-[#1a3a6b] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#142d54] disabled:cursor-not-allowed disabled:opacity-60";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a3a6b] text-white">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Import OTB Games from Chess-Results
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Every over-the-board game chess-results.com has for this player
          </p>
        </div>
      </div>

      {job ? (
        <ImportProgress
          playerRef={playerRef}
          job={job}
          error={jobError}
          onReset={() => { setJob(null); setJobError(null); }}
          onCancel={() => handleCancelImport(job.id)}
        />
      ) : (
        <div className="space-y-3">
          {knownFideId ? (
            // The ID is the identity. Letting someone edit it here only
            // invites importing another player's games onto this profile.
            <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-dark-border dark:bg-dark-surface">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">FIDE ID</p>
                <p className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                  {knownFideId}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                From profile
              </span>
            </div>
          ) : (
            <>
              <form
                onSubmit={(e) => { e.preventDefault(); if (fideInput.trim()) startImport(fideInput.trim()); }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={fideInput}
                  onChange={(e) => setFideInput(e.target.value)}
                  placeholder="FIDE ID, e.g. 1503014"
                  autoComplete="off"
                  className={inputClass}
                />
              </form>
              <form onSubmit={handleNameSearch} className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Or find them by name"
                  autoComplete="off"
                  className={inputClass}
                />
                <button type="submit" disabled={searching || !nameInput.trim()} className={buttonClass}>
                  {searching ? "Searching…" : "Find"}
                </button>
              </form>
              {candidates && candidates.length > 0 && (
                <div className="space-y-2">
                  {candidates.map((c) => (
                    <button
                      key={c.fideId}
                      type="button"
                      onClick={() => { setFideInput(c.fideId); setCandidates(null); }}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-[#1a3a6b]/40 hover:bg-blue-50/40 dark:border-dark-border dark:bg-dark-surface dark:hover:border-[#1a3a6b]/60 dark:hover:bg-blue-950/30"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-gray-900 dark:text-gray-100">{c.fullName}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {[c.federation, `FIDE ${c.fideId}`, c.standardRating && `Elo ${c.standardRating}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-[#1a3a6b] dark:text-blue-400">Use →</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <NotifyMeCheckbox checked={notifyEmail} onChange={setNotifyEmail} />

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="button"
            onClick={() => startImport(knownFideId || fideInput.trim())}
            disabled={starting || !(knownFideId || fideInput.trim())}
            className={buttonClass}
          >
            {starting ? "Starting…" : "Import all games"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Chess-themed progress bar ────────────────────────────────────────────────

/**
 * A rank of pawns filling up as tournaments land, instead of a bare spinner.
 * Capped at 20 cells so a 40-tournament import doesn't produce a wall of glyphs
 * — past that the pawns represent proportion rather than one-per-tournament.
 */
const PROGRESS_CELLS = 20;

function ImportProgressBar({
  done,
  total,
  games,
}: {
  done: number;
  total: number;
  games: number;
}) {
  // Always render a full rank, even for a one-tournament import — a bar with a
  // single cell has nowhere for the wave to travel.
  const cells = PROGRESS_CELLS;
  const filled = total === 0 ? 0 : Math.floor((done / total) * cells);

  return (
    <div
      className="rounded-xl border border-[#1a3a6b]/20 bg-white p-4 dark:border-[#1a3a6b]/40 dark:bg-dark-surface"
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label="Import progress"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Importing games
        </span>
        <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
          {done} of {total}
        </span>
      </div>

      <div className="flex flex-wrap gap-0.5" aria-hidden="true">
        {Array.from({ length: cells }, (_, i) => {
          const isDone = i < filled;
          return (
            <span
              key={i}
              // The staggered delay is what turns per-pawn pulses into a wave
              // that runs to the end and starts over.
              style={isDone ? undefined : { animationDelay: `${i * 0.08}s` }}
              className={`select-none text-lg leading-none transition-colors duration-300 ${
                isDone
                  ? "text-[#1a3a6b] dark:text-blue-400"
                  : "pawn-wave text-[#1a3a6b]/60 dark:text-blue-400/60"
              }`}
            >
              ♟
            </span>
          );
        })}
      </div>

      <p className="mt-2 text-xs tabular-nums text-gray-500 dark:text-gray-400">
        <span className="font-semibold text-gray-900 dark:text-gray-100">{games}</span> game
        {games !== 1 ? "s" : ""} imported so far
      </p>
    </div>
  );
}

// ── Import progress sub-component ────────────────────────────────────────────
function ImportProgress({
  playerRef,
  job,
  error,
  onReset,
  onCancel,
}: {
  playerRef: string;
  job: ImportJob;
  error: string | null;
  onReset: () => void;
  onCancel: () => void;
}) {
  const finished = isTerminal(job);
  const errorCount = job.results.filter((r) => r.status === "error").length;
  // Pending *and* nothing done yet. A long import returns to pending between
  // slices to let other people's imports through, and showing "Starting your
  // import…" over 40 finished tournaments would be a lie.
  const queued = job.status === "pending" && job.completed === 0;
  // Someone else's import is on the worker. Say so — an unexplained wait is
  // what makes people click Import a second time.
  const ahead = job.queue_ahead ?? 0;

  // A job sits in `pending` until a worker claims it, normally a second or
  // two. Much longer means no worker is running, and "Starting your import…"
  // forever is indistinguishable from the app being broken.
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    if (!queued) {
      setStalled(false);
      return;
    }
    const t = setTimeout(() => setStalled(true), 30_000);
    return () => clearTimeout(t);
  }, [queued]);

  return (
    <div className="space-y-3">
      {!finished && (
        <>
          {queued ? (
            // There is a real gap before a worker picks the job up. Say
            // something honest and human — queues and workers are our problem,
            // not the coach's.
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-dark-border dark:bg-dark-surface">
              <svg className="h-4 w-4 animate-spin text-[#1a3a6b]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {stalled
                  ? "This is taking longer than usual to start."
                  : ahead > 0
                    ? `Waiting on ${ahead} other import${ahead === 1 ? "" : "s"} to finish first…`
                    : "Starting your import…"}
              </span>
            </div>
          ) : (
            <ImportProgressBar
              done={job.completed}
              total={job.total}
              games={job.games_imported}
            />
          )}

          {queued && ahead > 0 && !stalled && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Yours starts automatically as soon as they&apos;re done. Nothing to do.
            </p>
          )}

          {stalled && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Your games are still queued and nothing has been lost. If this
              doesn&apos;t move shortly, please contact support.
            </p>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            You can leave this page — the import keeps going.
            {job.notify_email ? " We'll email you when it's done." : ""}
          </p>
        </>
      )}

      {/* Terminal banners */}
      {job.status === "succeeded" && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
          <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            {job.games_imported} game{job.games_imported !== 1 ? "s" : ""} imported
            {job.total > 1 ? ` across ${job.total} tournaments` : ""}
          </span>
        </div>
      )}

      {job.status === "failed" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            This import didn&apos;t complete.
          </p>
          <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">
            You can try again — anything already imported was kept.
          </p>
        </div>
      )}

      {job.status === "cancelled" && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-dark-border dark:bg-dark-elevated">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Import cancelled
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {job.completed} of {job.total} tournaments finished before stopping, and those were kept.
          </p>
        </div>
      )}

      {job.cancel_requested && !finished && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Stopping…
        </p>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      {/* Per-tournament rows, as the worker reports them */}
      <div className="space-y-2">
        {job.results.map((r, i) => (
          <div
            key={`${r.name}-${i}`}
            className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-dark-border dark:bg-dark-surface"
          >
            <div className="mt-0.5 shrink-0">
              {r.status === "done" ? (
                <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {r.name}
              </p>

              {r.status === "done" && r.skipped_reason === "no_moves" ? (
                <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                  No moves available — skipped (PGNs not uploaded to chess-results)
                </p>
              ) : r.status === "done" ? (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {r.games_imported ?? 0} imported
                  </span>
                  {(r.games_skipped ?? 0) > 0 && (
                    <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-400">
                      {r.games_skipped} skipped
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{r.message}</p>
              )}
            </div>
          </div>
        ))}

        {/*
          No placeholder rows for tournaments not yet reached. The progress bar
          already says how many are left, and a column of "Waiting…" told the
          user nothing while burying the rows that had actually finished.
        */}
      </div>

      {/*
        Sticky action bar. Importing twenty tournaments produces twenty rows,
        and "Cancel import" sitting below all of them was unreachable exactly
        when someone most wanted it.
      */}
      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-blue-50/95 px-1 py-3 backdrop-blur dark:border-dark-border dark:bg-dark-bg/95">
        {!finished && (
          <button
            type="button"
            onClick={onCancel}
            disabled={job.cancel_requested}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-900 disabled:opacity-50 dark:border-dark-border dark:text-gray-300 dark:hover:text-gray-100"
          >
            {job.cancel_requested ? "Cancelling…" : "Cancel import"}
          </button>
        )}

        {finished && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                ← Import more
              </button>
              {errorCount > 0 && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {errorCount} tournament{errorCount !== 1 ? "s" : ""} failed — you can try those again
                </span>
              )}
            </div>
            <Link href={`/players/${playerRef}`} className="btn-secondary text-sm">
              View Profile
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
