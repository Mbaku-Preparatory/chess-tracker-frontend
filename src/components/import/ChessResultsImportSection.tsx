"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type {
  ChessResultsImportResult,
  ChessResultsPlayerCandidate,
  ChessResultsTournamentOption,
} from "@/types";

interface ChessResultsImportSectionProps {
  slug: string;
  fideId?: string | null;
  onSuccess?: (result: ChessResultsImportResult) => void;
}

// ── State machine ─────────────────────────────────────────────────────────────

type TournamentResult =
  | { status: "pending" }
  | { status: "importing" }
  | { status: "done"; result: ChessResultsImportResult }
  | { status: "error"; message: string };

type Step =
  | { type: "idle" }
  | { type: "searching" }
  | { type: "selecting-player"; candidates: ChessResultsPlayerCandidate[] }
  | { type: "loading-tournaments"; crId: string; name: string }
  | { type: "selecting-tournaments"; playerName: string; tournaments: ChessResultsTournamentOption[] }
  | { type: "importing"; selected: ChessResultsTournamentOption[]; results: TournamentResult[] }
  | { type: "done"; selected: ChessResultsTournamentOption[]; results: TournamentResult[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildImportUrl(t: ChessResultsTournamentOption): string {
  return `https://chess-results.com/tnr${t.tnr}.aspx?lan=1&art=9&snr=${t.snr}`;
}

function totalImported(results: TournamentResult[]): number {
  return results.reduce((sum, r) => {
    if (r.status === "done") return sum + (r.result.games_imported ?? 0);
    return sum;
  }, 0);
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChessResultsImportSection({
  slug,
  fideId,
  onSuccess,
}: ChessResultsImportSectionProps) {
  const [step, setStep] = useState<Step>({ type: "idle" });
  const [searchMode, setSearchMode] = useState<"fide_id" | "name">(fideId ? "fide_id" : "name");
  const [fideInput, setFideInput] = useState(fideId ?? "");
  const [nameInput, setNameInput] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set()); // keys: `${tnr}-${snr}`
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [rawUrl, setRawUrl] = useState("");
  const [rawUrlStatus, setRawUrlStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [rawUrlError, setRawUrlError] = useState<string | null>(null);

  // ── Search ──────────────────────────────────────────────────────────────────

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);

    const params =
      searchMode === "fide_id"
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
      setSearchError(err instanceof Error ? err.message : "Search failed. Try again.");
    }
  }

  async function loadTournaments(crId: string, name: string) {
    setStep({ type: "loading-tournaments", crId, name });
    try {
      const data = await api.getChessResultsTournaments(crId);
      setSelected(new Set());
      setStep({
        type: "selecting-tournaments",
        playerName: data.player_name || name,
        tournaments: data.tournaments,
      });
    } catch (err) {
      setStep({ type: "idle" });
      setSearchError(err instanceof Error ? err.message : "Could not load tournament list.");
    }
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleImport(tournaments: ChessResultsTournamentOption[]) {
    const toImport = tournaments.filter((t) => selected.has(`${t.tnr}-${t.snr}`));
    if (toImport.length === 0) return;

    const results: TournamentResult[] = toImport.map(() => ({ status: "pending" }));
    setStep({ type: "importing", selected: toImport, results: [...results] });

    for (let i = 0; i < toImport.length; i++) {
      results[i] = { status: "importing" };
      setStep({ type: "importing", selected: toImport, results: [...results] });

      try {
        const result = await api.importFromChessResults(slug, {
          url: buildImportUrl(toImport[i]),
        });
        results[i] = { status: "done", result };
        onSuccess?.(result);
      } catch (err) {
        results[i] = {
          status: "error",
          message: err instanceof Error ? err.message : "Import failed.",
        };
      }

      setStep({ type: "importing", selected: toImport, results: [...results] });
    }

    setStep({ type: "done", selected: toImport, results: [...results] });
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
      setRawUrlError(err instanceof Error ? err.message : "Import failed.");
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
            {/* Mode tabs */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
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
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-gray-100"
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
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1a3a6b] focus:outline-none focus:ring-1 focus:ring-[#1a3a6b] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              />
            ) : (
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Timothy Mwabu"
                autoComplete="off"
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1a3a6b] focus:outline-none focus:ring-1 focus:ring-[#1a3a6b] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              />
            )}

            {searchError && (
              <p className="text-xs text-red-600 dark:text-red-400">{searchError}</p>
            )}

            <button
              type="submit"
              disabled={
                step.type === "searching" ||
                (searchMode === "fide_id" ? !fideInput.trim() : !nameInput.trim())
              }
              className="inline-flex items-center gap-2 rounded-lg bg-[#1a3a6b] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#142d54] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {step.type === "searching" && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {step.type === "searching" ? "Searching…" : "Search player"}
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
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1a3a6b] focus:outline-none focus:ring-1 focus:ring-[#1a3a6b] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
                />
                {rawUrl && !rawUrl.includes("chess-results.com") && (
                  <p className="text-xs text-red-600">URL must be from chess-results.com</p>
                )}
                {rawUrlError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{rawUrlError}</p>
                )}
                {rawUrlStatus === "done" && (
                  <p className="text-xs text-emerald-600">Games imported successfully.</p>
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
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-[#1a3a6b]/40 hover:bg-blue-50/40 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-[#1a3a6b]/60 dark:hover:bg-blue-950/30"
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

      {/* ── Step: selecting-tournaments ────────────────────────────────────── */}
      {step.type === "selecting-tournaments" && (
        <TournamentSelector
          playerName={step.playerName}
          tournaments={step.tournaments}
          selected={selected}
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
          onImport={() => handleImport(step.tournaments)}
        />
      )}

      {/* ── Step: importing ────────────────────────────────────────────────── */}
      {(step.type === "importing" || step.type === "done") && (
        <ImportProgress
          selected={step.selected}
          results={step.results}
          onReset={() => setStep({ type: "idle" })}
          isDone={step.type === "done"}
        />
      )}
    </div>
  );
}

// ── Tournament selector sub-component ────────────────────────────────────────

function TournamentSelector({
  playerName,
  tournaments,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
  onBack,
  onImport,
}: {
  playerName: string;
  tournaments: ChessResultsTournamentOption[];
  selected: Set<string>;
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
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
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

      <button
        type="button"
        disabled={selected.size === 0}
        onClick={onImport}
        className="inline-flex items-center gap-2 rounded-lg bg-[#1a3a6b] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#142d54] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Import {selected.size > 0 ? `${selected.size} tournament${selected.size !== 1 ? "s" : ""}` : "selected"}
      </button>
    </div>
  );
}

// ── Import progress sub-component ────────────────────────────────────────────

function ImportProgress({
  selected,
  results,
  onReset,
  isDone,
}: {
  selected: ChessResultsTournamentOption[];
  results: TournamentResult[];
  onReset: () => void;
  isDone: boolean;
}) {
  const imported = totalImported(results);
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <div className="space-y-3">
      {/* Overall status */}
      {isDone && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
          <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            {imported} game{imported !== 1 ? "s" : ""} imported
            {selected.length > 1 ? ` across ${selected.length} tournaments` : ""}
          </span>
        </div>
      )}

      {/* Per-tournament rows */}
      <div className="space-y-2">
        {selected.map((t, i) => {
          const r = results[i];
          return (
            <div
              key={`${t.tnr}-${t.snr}`}
              className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800"
            >
              {/* Status icon */}
              <div className="mt-0.5 shrink-0">
                {r.status === "pending" && (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
                {r.status === "importing" && (
                  <svg className="h-4 w-4 animate-spin text-[#1a3a6b]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {r.status === "done" && (
                  <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {r.status === "error" && (
                  <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {t.name}
                </p>

                {r.status === "done" && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {r.result.games_imported} imported
                    </span>
                    {r.result.games_skipped > 0 && (
                      <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-400">
                        {r.result.games_skipped} already existed
                      </span>
                    )}
                    <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-400 capitalize">
                      {r.result.fetch_meta?.source === "pgn" ? "Full PGN" : "Results only — no moves uploaded"}
                    </span>
                  </div>
                )}

                {r.status === "error" && (
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{r.message}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isDone && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            ← Import more
          </button>
          {errorCount > 0 && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {errorCount} tournament{errorCount !== 1 ? "s" : ""} failed — check URLs or try again
            </span>
          )}
        </div>
      )}
    </div>
  );
}
