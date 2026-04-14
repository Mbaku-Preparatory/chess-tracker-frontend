"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ChessResultsImportResult } from "@/types";

interface ChessResultsImportSectionProps {
  slug: string;
  fideId?: string | null;
  onSuccess?: (result: ChessResultsImportResult) => void;
}

type Status = "idle" | "loading" | "success" | "error";

export function ChessResultsImportSection({
  slug,
  fideId,
  onSuccess,
}: ChessResultsImportSectionProps) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ChessResultsImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = url.trim().length > 0 && url.includes("chess-results.com") && status !== "loading";

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setResult(null);
    setErrorMsg(null);

    try {
      const data = await api.importFromChessResults(slug, { url: url.trim() });
      setResult(data);
      setStatus("success");
      onSuccess?.(data);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Import failed. Check the URL and try again."
      );
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a3a6b] text-white">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Import OTB Games from Chess-Results</h3>
          <p className="text-xs text-gray-500">
            Fetch over-the-board tournament games from chess-results.com
          </p>
        </div>
      </div>

      {/* Instruction callout */}
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <p className="font-medium">How to get the URL</p>
        <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs">
          <li>
            Go to{" "}
            <span className="font-mono text-blue-700">chess-results.com</span> and find the
            tournament.
          </li>
          <li>
            Click on the player's name to open their individual result page
            (URL will contain <span className="font-mono">art=9&amp;snr=…</span>).
          </li>
          <li>Copy and paste that URL below.</li>
        </ol>
        {fideId && (
          <p className="mt-2 text-xs">
            FIDE ID for this player:{" "}
            <span className="font-semibold">{fideId}</span> — useful when searching on
            chess-results.com.
          </p>
        )}
      </div>

      <form onSubmit={handleImport} className="space-y-4">
        <div>
          <label htmlFor="chess-results-url" className="mb-1.5 block text-sm font-medium text-gray-700">
            Chess-Results player URL
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            id="chess-results-url"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setResult(null);
              setErrorMsg(null);
              setStatus("idle");
            }}
            placeholder="https://s3.chess-results.com/tnr12345.aspx?lan=1&art=9&snr=42"
            autoComplete="off"
            spellCheck={false}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1a3a6b] focus:outline-none focus:ring-1 focus:ring-[#1a3a6b]"
          />
          {url && !url.includes("chess-results.com") && (
            <p className="mt-1 text-xs text-red-600">URL must be from chess-results.com</p>
          )}
          {url.includes("chess-results.com") && !url.includes("snr=") && (
            <p className="mt-1 text-xs text-amber-600">
              Tip: the URL should include <span className="font-mono">snr=…</span> (the player's
              starting number). Navigate to the player's individual result page.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
              canSubmit
                ? "bg-[#1a3a6b] hover:bg-[#142d54] focus:outline-none focus:ring-2 focus:ring-[#1a3a6b] focus:ring-offset-1"
                : "cursor-not-allowed bg-gray-300"
            }`}
          >
            {status === "loading" && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {status === "loading" ? "Fetching games…" : "Import OTB Games"}
          </button>

          {status === "success" && result && (
            <span className="text-sm text-emerald-700">
              ✓ {result.games_imported} game{result.games_imported !== 1 ? "s" : ""} imported
            </span>
          )}
        </div>

        {status === "loading" && (
          <p className="text-xs text-gray-500">
            Fetching from chess-results.com — this may take a few seconds…
          </p>
        )}
      </form>

      {/* Error */}
      {status === "error" && errorMsg && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Success */}
      {status === "success" && result && (
        <div className="mt-4 space-y-3">
          {/* Summary banner */}
          <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-emerald-800">
              <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-semibold">
                {result.games_imported} game{result.games_imported !== 1 ? "s" : ""} imported successfully
              </span>
            </div>
          </div>

          {/* Metadata badges */}
          <FetchMetaBadges result={result} />
        </div>
      )}
    </div>
  );
}

function FetchMetaBadges({ result }: { result: ChessResultsImportResult }) {
  const { fetch_meta } = result;
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="rounded-full border border-blue-200 bg-blue-100 px-2.5 py-1 text-blue-700">
        {fetch_meta.tournament_name}
      </span>
      <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-gray-600 capitalize">
        {fetch_meta.source === "pgn" ? "Full PGN" : "Results only"}
      </span>
      {result.games_skipped > 0 && (
        <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-gray-500">
          {result.games_skipped} game{result.games_skipped !== 1 ? "s" : ""} already existed
        </span>
      )}
      {result.games_failed > 0 && (
        <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-amber-700">
          {result.games_failed} failed
        </span>
      )}
    </div>
  );
}
