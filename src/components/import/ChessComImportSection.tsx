"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { ConnectedAccountManager } from "./ConnectedAccountManager";
import { ImportJobProgress } from "./ImportJobProgress";
import { useImportJob } from "./useImportJob";
import type { ImportJob, PlayerAccount } from "@/types";

interface ChessComImportSectionProps {
  slug: string;
  accounts?: PlayerAccount[];
  onSuccess?: (job: ImportJob) => void;
  onUpdated?: () => void | Promise<void>;
}

export function ChessComImportSection({
  slug,
  accounts = [],
  onSuccess,
  onUpdated,
}: ChessComImportSectionProps) {
  const chesscomAccounts = accounts.filter((a) => a.platform === "chesscom");
  const [username, setUsername] = useState(chesscomAccounts[0]?.username || "");
  const [limit, setLimit] = useState(50);

  // The import runs in the worker service now, so this component holds a job
  // id and polls rather than awaiting a result. `matches` keeps this panel
  // showing Chess.com work only — a player can have a chess-results import
  // running at the same time.
  const { job, starting, error, start, cancel, reset, isRunning } = useImportJob({
    slug,
    matches: (j) => j.results?.[0]?.name?.startsWith("Chess.com") ?? false,
    onSettled: async (settled) => {
      if (settled.status === "succeeded") onSuccess?.(settled);
      await onUpdated?.();
    },
  });

  const canSubmit = username.trim().length > 0 && !starting && !isRunning;

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await start(
      () => api.importFromChessCom(slug, { username: username.trim(), limit }),
      "Import failed. Check the username and try again.",
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7fa650] text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M10 2a1 1 0 00-1 1v1H8a3 3 0 00-3 3v1H4a1 1 0 000 2h1v1a3 3 0 003 3h.17l-1.9 4.55A1 1 0 007.2 20h9.6a1 1 0 00.93-1.45L15.83 14H16a3 3 0 003-3v-1h1a1 1 0 000-2h-1V7a3 3 0 00-3-3h-1V3a1 1 0 00-1-1h-4z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Import from Chess.com</h3>
            <p className="text-xs text-gray-500">
              Fetch the opponent&apos;s recent public games automatically
            </p>
          </div>
        </div>

        <form onSubmit={handleImport} className="space-y-4">
          {chesscomAccounts.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {chesscomAccounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { setUsername(a.username); reset(); }}
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
                onChange={(e) => { setUsername(e.target.value); reset(); }}
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
              {starting && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {starting ? "Queueing…" : isRunning ? "Import running…" : "Import from Chess.com"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <ImportJobProgress
          job={job}
          onCancel={cancel}
          runningLabel="Fetching archives from Chess.com…"
        />
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
