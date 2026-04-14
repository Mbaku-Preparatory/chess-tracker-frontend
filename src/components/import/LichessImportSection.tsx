"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { ConnectedAccountManager } from "./ConnectedAccountManager";
import { ImportResultPanel } from "./ImportResultPanel";
import type { LichessImportResult, PlayerAccount, PGNImportResult } from "@/types";

interface LichessImportSectionProps {
  slug: string;
  accounts?: PlayerAccount[];
  onSuccess?: (result: LichessImportResult) => void;
  onUpdated?: () => void | Promise<void>;
}

type Status = "idle" | "loading" | "success" | "error";

export function LichessImportSection({
  slug,
  accounts = [],
  onSuccess,
  onUpdated,
}: LichessImportSectionProps) {
  const lichessAccounts = accounts.filter((a) => a.platform === "lichess");
  const [username, setUsername] = useState(lichessAccounts[0]?.username || "");
  const [limit, setLimit] = useState(50);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<LichessImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = username.trim().length > 0 && status !== "loading";

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setResult(null);
    setErrorMsg(null);

    try {
      const data = await api.importFromLichess(slug, {
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
    <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-5">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-3">
        {/* Lichess knight icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#b05000] text-white">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M19 22H5v-2h14v2M13 2a3 3 0 00-3 3c0 .88.39 1.67 1 2.22V8l-3 1-2 4h2v1H6l-1 3h14l-1-3h-2v-1h2l-2-4-3-1V7.22c.61-.55 1-1.34 1-2.22a3 3 0 00-1-2.24V2h-1z"/>
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Import from Lichess</h3>
          <p className="text-xs text-gray-500">
            Fetch the opponent's recent public games automatically
          </p>
        </div>
      </div>

      <form onSubmit={handleImport} className="space-y-4">
        {/* Account chips (quick-select) */}
        {lichessAccounts.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {lichessAccounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => { setUsername(a.username); setResult(null); setStatus("idle"); }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  username === a.username
                    ? "border-[#b05000] bg-[#b05000] text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-[#b05000] hover:text-[#b05000]"
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
              htmlFor="lichess-username"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Lichess username
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              id="lichess-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setResult(null);
                setErrorMsg(null);
                setStatus("idle");
              }}
              placeholder="e.g. DrNykterstein"
              autoComplete="off"
              spellCheck={false}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="w-full sm:w-32">
            <label
              htmlFor="lichess-limit"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Games to fetch
            </label>
            <select
              id="lichess-limit"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
                ? "bg-[#b05000] hover:bg-[#8f4200] focus:outline-none focus:ring-2 focus:ring-[#b05000] focus:ring-offset-1"
                : "cursor-not-allowed bg-gray-300"
            }`}
          >
            {status === "loading" && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {status === "loading" ? "Fetching games…" : "Import from Lichess"}
          </button>

          {status === "success" && result && (
            <span className="text-sm text-emerald-700">
              ✓ {result.games_imported} game{result.games_imported !== 1 ? "s" : ""} imported
            </span>
          )}
        </div>

        {/* Loading hint */}
        {status === "loading" && (
          <p className="text-xs text-gray-500">
            Fetching games from Lichess — this may take a few seconds…
          </p>
        )}
      </form>

      {/* Error */}
      {status === "error" && errorMsg && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Success result */}
      {status === "success" && result && (
        <div className="mt-4 space-y-3">
          <FetchMetaBadges result={result} />
          <ImportResultPanel result={result as unknown as PGNImportResult} />
        </div>
      )}

      <ConnectedAccountManager
        slug={slug}
        platform="lichess"
        accounts={accounts}
        onUpdated={onUpdated}
      />
    </div>
  );
}

function FetchMetaBadges({ result }: { result: LichessImportResult }) {
  const { fetch_meta } = result;
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="rounded-full border border-orange-200 bg-orange-100 px-2.5 py-1 text-orange-700">
        {fetch_meta.games_fetched} fetched from Lichess
      </span>
      {result.games_skipped > 0 && (
        <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-gray-500">
          {result.games_skipped} game{result.games_skipped !== 1 ? "s" : ""} skipped
        </span>
      )}
    </div>
  );
}
