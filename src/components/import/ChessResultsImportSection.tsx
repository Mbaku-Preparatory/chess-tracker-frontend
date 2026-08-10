"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type {
  ChessResultsImportResult,
  ChessResultsPlayerCandidate,
  ChessResultsTournamentOption,
  ImportJob,
} from "@/types";
import { userMessage } from "@/lib/apiError";
import { useActiveImports } from "./ActiveImportsProvider";

interface ChessResultsImportSectionProps {
  slug: string;
  playerRef: string;
  fideId?: string | null;
  // Called when an import completes. The single-URL fallback has a result to
  // hand over; a background job reports its own detail, so it passes nothing.
  onSuccess?: (result?: ChessResultsImportResult) => void;
}

// ── State machine ─────────────────────────────────────────────────────────────

type Step =
  | { type: "idle" }
  | { type: "searching" }
  | { type: "selecting-player"; candidates: ChessResultsPlayerCandidate[] }
  | { type: "loading-tournaments"; crId: string; name: string }
  | { type: "choose-mode"; playerName: string; tournaments: ChessResultsTournamentOption[] }
  | { type: "selecting-tournaments"; playerName: string; tournaments: ChessResultsTournamentOption[] }
  // The import itself no longer lives in this component — it is a row in the
  // database being worked on by the worker service. All we hold is its id.
  | { type: "job"; job: ImportJob };

const POLL_INTERVAL_MS = 2000;

function isTerminal(job: ImportJob): boolean {
  return job.status === "succeeded" || job.status === "failed" || job.status === "cancelled";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildImportUrl(t: ChessResultsTournamentOption): string {
  // Prefer the full original URL from chess-results (includes SNode, fed, etc.
  // that team/Olympiad events require).  Fall back to a constructed URL for
  // entries created before this field was added.
  if (t.url) return t.url;
  return `https://chess-results.com/tnr${t.tnr}.aspx?lan=1&art=9&snr=${t.snr}`;
}


// ── Main component ────────────────────────────────────────────────────────────

export function ChessResultsImportSection({
  slug,
  playerRef,
  fideId,
  onSuccess,
}: ChessResultsImportSectionProps) {
  // The profile already knows who this is — don't offer to look up someone else.
  const hasKnownFideId = Boolean(fideId?.trim());

  const [step, setStep] = useState<Step>({ type: "idle" });
  const [searchMode, setSearchMode] = useState<"fide_id" | "name">(
    hasKnownFideId ? "fide_id" : "name"
  );
  const [fideInput, setFideInput] = useState(fideId ?? "");
  const [nameInput, setNameInput] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set()); // keys: `${tnr}-${snr}`
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [rawUrl, setRawUrl] = useState("");
  const [rawUrlStatus, setRawUrlStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [rawUrlError, setRawUrlError] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [notifyEmail, setNotifyEmail] = useState(false);

  // The app-shell pill polls on its own timer; nudging it means starting or
  // cancelling an import shows up there immediately rather than up to 3s late.
  const { refresh: refreshActiveImports } = useActiveImports();

  // onSuccess is called once when a job completes; keeping it in a ref means
  // the polling effect doesn't restart every time the parent re-renders.
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const refreshRef = useRef(refreshActiveImports);
  refreshRef.current = refreshActiveImports;

  const activeJobId = step.type === "job" && !isTerminal(step.job) ? step.job.id : null;

  // ── Reconnect to an import already in progress ──────────────────────────────
  //
  // The whole point of moving this server-side: a coach can close the tab mid
  // -import, come back, and still see it running. Nothing in component state
  // survives that, so on mount we ask whether this player has a live job.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { results } = await api.recentImportJobs(slug);
        const live = results.find((j) => !isTerminal(j));
        if (live && !cancelled) {
          setStep((current) =>
            current.type === "idle" ? { type: "job", job: live } : current
          );
        }
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
        const job = await api.getImportJob(activeJobId);
        if (cancelled) return;
        setStep({ type: "job", job });
        if (isTerminal(job)) {
          if (job.status === "succeeded") onSuccessRef.current?.(undefined);
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

  // ── Search ──────────────────────────────────────────────────────────────────

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);

    // A known FIDE ID always wins over whatever is in the inputs — the field
    // isn't rendered in that case, so its state is not something to trust.
    const params = hasKnownFideId
      ? { fide_id: fideId!.trim() }
      : searchMode === "fide_id"
        ? { fide_id: fideInput.trim() }
        : { q: nameInput.trim() };

    if (!Object.values(params)[0]) return;

    setStep({ type: "searching" });

    try {
      const { results } = await api.searchChessResultsPlayer(params);

      if (results.length === 0) {
        setStep({ type: "idle" });
        setSearchError("No players found. Try a different name or check the FIDE ID.");
        return;
      }

      if (results.length === 1) {
        // Skip candidate selection — load tournaments directly
        await loadTournaments(results[0].cr_id, results[0].name);
      } else {
        setStep({ type: "selecting-player", candidates: results });
      }
    } catch (err) {
      setStep({ type: "idle" });
      setSearchError(userMessage(err, "Search failed. Try again."));
    }
  }

  async function loadTournaments(crId: string, name: string) {
    setStep({ type: "loading-tournaments", crId, name });
    try {
      const data = await api.getChessResultsTournaments(crId);
      // Start empty. "Fetch all" is its own button, so someone who chose to
      // pick tournaments meant to pick them — handing them a full set to
      // untick is the opposite of what they asked for.
      setSelected(new Set());
      setStep({
        type: "choose-mode",
        playerName: data.player_name || name,
        tournaments: data.tournaments,
      });
    } catch (err) {
      setStep({ type: "idle" });
      setSearchError(userMessage(err, "Could not load tournament list."));
    }
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleCancelImport(jobId: string) {
    try {
      const job = await api.cancelImportJob(jobId);
      setStep({ type: "job", job });
      refreshActiveImports();
    } catch (err) {
      setJobError(userMessage(err, "Could not cancel the import."));
    }
  }

  async function handleImport(toImport: ChessResultsTournamentOption[]) {
    // The caller decides what "these" means: every tournament for Fetch all,
    // the ticked ones for the picker. Reading selection state in here is what
    // coupled the two paths together.
    if (toImport.length === 0) return;

    setJobError(null);
    try {
      // Returns as soon as the job row exists — the importing happens in the
      // worker, so this resolves in milliseconds regardless of batch size.
      const job = await api.createImportJob(
        slug,
        toImport.map((t) => ({ name: t.name, url: buildImportUrl(t) })),
        notifyEmail
      );
      setStep({ type: "job", job });
      refreshActiveImports();
    } catch (err) {
      setJobError(userMessage(err, "Could not start the import."));
    }
  }

  // ── Raw URL fallback ────────────────────────────────────────────────────────

  async function handleRawUrlImport(e: React.FormEvent) {
    e.preventDefault();
    if (!rawUrl.trim() || !rawUrl.includes("chess-results.com")) return;
    setRawUrlStatus("loading");
    setRawUrlError(null);
    try {
      const result = await api.importFromChessResults(slug, { url: rawUrl.trim() });
      setRawUrlStatus("done");
      onSuccess?.(result);
    } catch (err) {
      setRawUrlError(userMessage(err, "Import failed."));
      setRawUrlStatus("error");
    }
  }

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
            Fetch over-the-board tournament games from chess-results.com
          </p>
        </div>
      </div>

      {/* ── Step: idle / searching ─────────────────────────────────────────── */}
      {(step.type === "idle" || step.type === "searching") && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="space-y-3">
            {/*
              A player with a FIDE ID on file has nothing to type and nothing to
              choose: the ID is the identity, and letting someone edit it here
              only invites importing another player's games onto this profile.
              The tabs and the input appear only when we don't already know it.
            */}
            {hasKnownFideId ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-dark-border dark:bg-dark-surface">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Searching by FIDE ID</p>
                  <p className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                    {fideId}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  From profile
                </span>
              </div>
            ) : (
              <>
                {/* Mode tabs */}
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-dark-elevated">
                  {(["fide_id", "name"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setSearchMode(mode);
                        setSearchError(null);
                      }}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        searchMode === mode
                          ? "bg-white text-gray-900 shadow-sm dark:bg-dark-muted dark:text-gray-100"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      {mode === "fide_id" ? "By FIDE ID" : "By Name"}
                    </button>
                  ))}
                </div>

                {searchMode === "fide_id" ? (
                  <input
                    type="text"
                    value={fideInput}
                    onChange={(e) => setFideInput(e.target.value)}
                    placeholder="e.g. 1503014"
                    autoComplete="off"
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1a3a6b] focus:outline-none focus:ring-1 focus:ring-[#1a3a6b] dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. Timothy Mwabu"
                    autoComplete="off"
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1a3a6b] focus:outline-none focus:ring-1 focus:ring-[#1a3a6b] dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500"
                  />
                )}
              </>
            )}

            {searchError && (
              <p className="text-xs text-red-600 dark:text-red-400">{searchError}</p>
            )}

            <button
              type="submit"
              disabled={
                step.type === "searching" ||
                (!hasKnownFideId &&
                  (searchMode === "fide_id" ? !fideInput.trim() : !nameInput.trim()))
              }
              className="inline-flex items-center gap-2 rounded-lg bg-[#1a3a6b] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#142d54] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {step.type === "searching" && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {step.type === "searching" ? "Searching…" : "Search Games"}
            </button>
          </form>

          {/* URL fallback */}
          <div>
            <button
              type="button"
              onClick={() => setShowUrlFallback((v) => !v)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showUrlFallback ? "▾" : "▸"} Already have a direct URL?
            </button>

            {showUrlFallback && (
              <form onSubmit={handleRawUrlImport} className="mt-2 space-y-2">
                <input
                  type="url"
                  value={rawUrl}
                  onChange={(e) => {
                    setRawUrl(e.target.value);
                    setRawUrlStatus("idle");
                    setRawUrlError(null);
                  }}
                  placeholder="https://chess-results.com/tnr12345.aspx?lan=1&art=9&snr=42"
                  autoComplete="off"
                  spellCheck={false}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1a3a6b] focus:outline-none focus:ring-1 focus:ring-[#1a3a6b] dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500"
                />
                {rawUrl && !rawUrl.includes("chess-results.com") && (
                  <p className="text-xs text-red-600">URL must be from chess-results.com</p>
                )}
                {rawUrlError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{rawUrlError}</p>
                )}
                {rawUrlStatus === "done" && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-emerald-600">Games imported successfully.</p>
                    <Link href={`/players/${playerRef}`} className="btn-secondary text-xs">
                      View Profile
                    </Link>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={
                    rawUrlStatus === "loading" ||
                    !rawUrl.includes("chess-results.com")
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1a3a6b] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#142d54] disabled:opacity-60"
                >
                  {rawUrlStatus === "loading" && (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {rawUrlStatus === "loading" ? "Importing…" : "Import from URL"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Step: selecting-player ─────────────────────────────────────────── */}
      {step.type === "selecting-player" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setStep({ type: "idle" }); setSearchError(null); }}
              className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            >
              ← Search again
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select the correct player
            </span>
          </div>

          <div className="space-y-2">
            {step.candidates.map((c) => (
              <button
                key={c.cr_id}
                type="button"
                onClick={() => loadTournaments(c.cr_id, c.name)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-[#1a3a6b]/40 hover:bg-blue-50/40 dark:border-dark-border dark:bg-dark-surface dark:hover:border-[#1a3a6b]/60 dark:hover:bg-blue-950/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {c.title && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        {c.title}
                      </span>
                    )}
                    <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {c.federation && <span>{c.federation}</span>}
                    {c.fide_id && <span>FIDE {c.fide_id}</span>}
                    {c.rating && <span>Elo {c.rating}</span>}
                    {c.birth_year && <span>b. {c.birth_year}</span>}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium text-[#1a3a6b] dark:text-blue-400">
                  Select →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step: loading-tournaments ──────────────────────────────────────── */}
      {step.type === "loading-tournaments" && (
        <div className="flex items-center gap-2 py-2 text-sm text-gray-500 dark:text-gray-400">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading tournaments for {step.name}…
        </div>
      )}

      {/* ── Step: choose-mode ──────────────────────────────────────────────── */}
      {step.type === "choose-mode" && (
        <ImportModeChooser
          playerName={step.playerName}
          count={step.tournaments.length}
          notifyEmail={notifyEmail}
          onNotifyChange={setNotifyEmail}
          onBack={() => { setStep({ type: "idle" }); setSearchError(null); }}
          onFetchAll={() => handleImport(step.tournaments)}
          onChoose={() =>
            setStep({
              type: "selecting-tournaments",
              playerName: step.playerName,
              tournaments: step.tournaments,
            })
          }
        />
      )}

      {/* ── Step: selecting-tournaments ────────────────────────────────────── */}
      {step.type === "selecting-tournaments" && (
        <TournamentSelector
          playerName={step.playerName}
          tournaments={step.tournaments}
          selected={selected}
          notifyEmail={notifyEmail}
          onNotifyChange={setNotifyEmail}
          onToggle={(key) =>
            setSelected((prev) => {
              const next = new Set(prev);
              next.has(key) ? next.delete(key) : next.add(key);
              return next;
            })
          }
          onSelectAll={() =>
            setSelected(new Set(step.tournaments.map((t) => `${t.tnr}-${t.snr}`)))
          }
          onClearAll={() => setSelected(new Set())}
          onBack={() => { setStep({ type: "idle" }); setSearchError(null); }}
          onImport={() =>
            handleImport(
              step.tournaments.filter((t) => selected.has(`${t.tnr}-${t.snr}`))
            )
          }
        />
      )}

      {/* ── Step: job running or finished ──────────────────────────────────── */}
      {step.type === "job" && (
        <ImportProgress
          playerRef={playerRef}
          job={step.job}
          error={jobError}
          onReset={() => { setStep({ type: "idle" }); setJobError(null); }}
          onCancel={() => handleCancelImport(step.job.id)}
        />
      )}
    </div>
  );
}

// ── Notify-me control ────────────────────────────────────────────────────────

/**
 * Offered at both entry points, because the decision belongs with the click
 * that starts the import — not somewhere in account settings.
 */
function NotifyMeCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition hover:border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:hover:border-gray-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[#1a3a6b]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Email me when this is done
        </span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">
          Useful for big imports — we&apos;ll send a link straight to the player.
        </span>
      </span>
    </label>
  );
}

// ── Import mode chooser ──────────────────────────────────────────────────────

/**
 * Two ways in, offered up front: take everything, or pick. Fetching all is the
 * common case and shouldn't cost twenty clicks, but a coach re-importing one
 * event shouldn't have to untick nineteen either.
 */
function ImportModeChooser({
  playerName,
  count,
  notifyEmail,
  onNotifyChange,
  onBack,
  onFetchAll,
  onChoose,
}: {
  playerName: string;
  count: number;
  notifyEmail: boolean;
  onNotifyChange: (v: boolean) => void;
  onBack: () => void;
  onFetchAll: () => void;
  onChoose: () => void;
}) {
  if (count === 0) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={onBack} className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
          ← Search again
        </button>
        <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No tournaments found for this player on chess-results.com.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
          ← Back
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {playerName} · {count} tournament{count !== 1 ? "s" : ""} found
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onFetchAll}
          className="group flex flex-col items-start gap-2 rounded-xl border-2 border-[#1a3a6b]/30 bg-white p-4 text-left transition hover:border-[#1a3a6b] hover:shadow-md dark:border-[#1a3a6b]/50 dark:bg-dark-surface dark:hover:border-[#1a3a6b]"
        >
          <span className="text-2xl leading-none">♞</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            Fetch all tournaments
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Import every one of the {count} events we found. Best for a new player.
          </span>
          <span className="mt-auto pt-2 text-xs font-semibold text-[#1a3a6b] group-hover:underline dark:text-blue-400">
            Start import →
          </span>
        </button>

        <button
          type="button"
          onClick={onChoose}
          className="group flex flex-col items-start gap-2 rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition hover:border-gray-400 hover:shadow-md dark:border-dark-border dark:bg-dark-surface dark:hover:border-gray-500"
        >
          <span className="text-2xl leading-none">♟</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            Choose tournaments
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Pick exactly which events to bring in.
          </span>
          <span className="mt-auto pt-2 text-xs font-semibold text-gray-600 group-hover:underline dark:text-gray-300">
            Pick manually →
          </span>
        </button>
      </div>

      <NotifyMeCheckbox checked={notifyEmail} onChange={onNotifyChange} />
    </div>
  );
}

// ── Tournament selector sub-component ────────────────────────────────────────

function TournamentSelector({
  playerName,
  tournaments,
  selected,
  notifyEmail,
  onNotifyChange,
  onToggle,
  onSelectAll,
  onClearAll,
  onBack,
  onImport,
}: {
  playerName: string;
  tournaments: ChessResultsTournamentOption[];
  selected: Set<string>;
  notifyEmail: boolean;
  onNotifyChange: (v: boolean) => void;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onBack: () => void;
  onImport: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            ← Back
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {playerName}
          </span>
        </div>
        <div className="flex gap-2 text-xs text-gray-400">
          <button type="button" onClick={onSelectAll} className="hover:text-gray-700 dark:hover:text-gray-200">
            Select all
          </button>
          <span>·</span>
          <button type="button" onClick={onClearAll} className="hover:text-gray-700 dark:hover:text-gray-200">
            Clear
          </button>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No tournaments found for this player on chess-results.com.
        </p>
      ) : (
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {tournaments.map((t) => {
            const key = `${t.tnr}-${t.snr}`;
            const checked = selected.has(key);
            return (
              <label
                key={key}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                  checked
                    ? "border-[#1a3a6b]/40 bg-blue-50/60 dark:border-[#1a3a6b]/50 dark:bg-blue-950/30"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:hover:border-gray-600"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(key)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[#1a3a6b]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t.name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {[t.year, t.location].filter(Boolean).join(" · ") || "No date/location info"}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      )}

      <NotifyMeCheckbox checked={notifyEmail} onChange={onNotifyChange} />

      {/*
        Sticky: the list can run to twenty-plus rows, and a button that has
        scrolled off the bottom of a long page may as well not exist.
      */}
      <div className="sticky bottom-0 -mx-1 flex items-center gap-3 border-t border-gray-200 bg-blue-50/95 px-1 py-3 backdrop-blur dark:border-dark-border dark:bg-dark-bg/95">
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={onImport}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1a3a6b] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#142d54] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Import {selected.size > 0 ? `${selected.size} tournament${selected.size !== 1 ? "s" : ""}` : "selected"}
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {selected.size} of {tournaments.length} selected
        </span>
      </div>
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
          {total === 1 ? "Importing tournament" : "Importing tournaments"}
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
  const queued = job.status === "pending";
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
          Stopping after the current tournament…
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
