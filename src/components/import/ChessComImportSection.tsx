"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ConnectedAccountManager } from "./ConnectedAccountManager";
import { ImportResultPanel } from "./ImportResultPanel";
import type { ChessComImportResult, PlayerAccount, PGNImportResult } from "@/types";

interface ChessComImportSectionProps {
  slug: string;
  accounts?: PlayerAccount[];
  onSuccess?: (result: ChessComImportResult) => void;
  onUpdated?: () => void | Promise<void>;
}

type Status = "idle" | "loading" | "success" | "error";

export function ChessComImportSection({
  slug,
  accounts = [],
  onSuccess,
  onUpdated,
}: ChessComImportSectionProps) {
  const chesscomAccounts = accounts.filter((a) => a.platform === "chesscom");
  const [username, setUsername] = useState(chesscomAccounts[0]?.username || "");
  const [limit, setLimit] = useState(50);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ChessComImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = username.trim().length > 0 && status !== "loading";

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setResult(null);
    setErrorMsg(null);

    try {
      const data = await api.importFromChessCom(slug, {
        username: username.trim(),
        limit,
      });
      setResult(data);
      setStatus("success");
      onSuccess?.(data);
      await onUpdated?.();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Import failed. Check the username and try again."
      );
      setStatus("error");
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5">
        {/* Section header */}
        <div className="mb-4 flex items-center gap-3">
          {/* Chess.com logo-ish mark */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7fa650] text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M10 2a1 1 0 00-1 1v1H8a3 3 0 00-3 3v1H4a1 1 0 000 2h1v1a3 3 0 003 3h.17l-1.9 4.55A1 1 0 007.2 20h9.6a1 1 0 00.93-1.45L15.83 14H16a3 3 0 003-3v-1h1a1 1 0 000-2h-1V7a3 3 0 00-3-3h-1V3a1 1 0 00-1-1h-4z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Import from Chess.com</h3>
            <p className="text-xs text-gray-500">
              Fetch the opponent's recent public games automatically
            </p>
          </div>
        </div>

        <form onSubmit={handleImport} className="space-y-4">
          {/* Account chips (quick-select) */}
          {chesscomAccounts.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {chesscomAccounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { setUsername(a.username); setResult(null); setStatus("idle"); }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    username === a.username
                      ? "border-[#7fa650] bg-[#7fa650] text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-[#7fa650] hover:text-[#7fa650]"
                  }`}
                >
                  {a.username}
                </button>
              ))}
            </div>
          )}

          {/* Username + limit row */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label
                htmlFor="chesscom-username"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Chess.com username
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                id="chesscom-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setResult(null);
                  setErrorMsg(null);
                  setStatus("idle");
                }}
                placeholder="e.g. hikaru"
                autoComplete="off"
                spellCheck={false}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="w-full sm:w-32">
              <label
                htmlFor="chesscom-limit"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Games to fetch
              </label>
              <select
                id="chesscom-limit"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          {/* Action */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                canSubmit
                  ? "bg-[#7fa650] hover:bg-[#6b8f44] focus:outline-none focus:ring-2 focus:ring-[#7fa650] focus:ring-offset-1"
                  : "cursor-not-allowed bg-gray-300"
              }`}
            >
              {status === "loading" && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {status === "loading" ? "Fetching games…" : "Import from Chess.com"}
            </button>
          </div>

          {/* Loading hint */}
          {status === "loading" && (
            <p className="text-xs text-gray-500">
              Fetching archives from Chess.com — this may take a few seconds…
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
          <div className="mt-4 space-y-4">
            {/* Success banner + CTA */}
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

            <FetchMetaBadges result={result} />
            <ImportResultPanel result={result as unknown as PGNImportResult} />
          </div>
        )}
      </div>
      <ConnectedAccountManager
        slug={slug}
        platform="chesscom"
        accounts={accounts}
        onUpdated={onUpdated}
      />
    </div>
  );
}

function FetchMetaBadges({ result }: { result: ChessComImportResult }) {
  const { fetch_meta } = result;
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="rounded-full border border-brand-200 bg-brand-100 px-2.5 py-1 text-brand-700">
        {fetch_meta.games_fetched} fetched from Chess.com
      </span>
      <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-gray-600">
        {fetch_meta.archives_visited} month{fetch_meta.archives_visited !== 1 ? "s" : ""} scanned
      </span>
      {fetch_meta.archives_failed > 0 && (
        <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-amber-700">
          {fetch_meta.archives_failed} month{fetch_meta.archives_failed !== 1 ? "s" : ""} skipped (network error)
        </span>
      )}
      {result.games_skipped > 0 && (
        <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-gray-500">
          {result.games_skipped} game{result.games_skipped !== 1 ? "s" : ""} skipped
        </span>
      )}
    </div>
  );
}
