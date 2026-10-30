"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { ConnectedAccountManager } from "./ConnectedAccountManager";
import { ImportJobProgress } from "./ImportJobProgress";
import { useImportJob } from "./useImportJob";
import type { ImportJob, PlayerAccount } from "@/types";

type Platform = "chesscom" | "lichess";

/**
 * What differs between the two sites; everything else is the same panel.
 * Tailwind only builds classes it finds written out whole, so each site's
 * colours are full class strings here, never assembled from a hex.
 */
const SITES: Record<
  Platform,
  {
    name: string;
    placeholder: string;
    runningLabel: string;
    icon: string;
    start: (slug: string, body: { username: string; limit: number }) => ReturnType<typeof api.importFromChessCom>;
    iconBox: string;
    chipOn: string;
    chipOff: string;
    selectFocus: string;
    submit: string;
  }
> = {
  chesscom: {
    name: "Chess.com",
    placeholder: "e.g. hikaru",
    runningLabel: "Fetching archives from Chess.com…",
    icon: "M10 2a1 1 0 00-1 1v1H8a3 3 0 00-3 3v1H4a1 1 0 000 2h1v1a3 3 0 003 3h.17l-1.9 4.55A1 1 0 007.2 20h9.6a1 1 0 00.93-1.45L15.83 14H16a3 3 0 003-3v-1h1a1 1 0 000-2h-1V7a3 3 0 00-3-3h-1V3a1 1 0 00-1-1h-4z",
    start: (slug, body) => api.importFromChessCom(slug, body),
    iconBox: "bg-[#7fa650]",
    chipOn: "border-[#7fa650] bg-[#7fa650] text-white",
    chipOff: "hover:border-[#7fa650] hover:text-[#7fa650]",
    selectFocus: "focus:border-brand-500 focus:ring-brand-500",
    submit: "bg-[#7fa650] hover:bg-[#6b8f44] focus:outline-none focus:ring-2 focus:ring-[#7fa650] focus:ring-offset-1",
  },
  lichess: {
    name: "Lichess",
    placeholder: "e.g. DrNykterstein",
    runningLabel: "Fetching games from Lichess…",
    icon: "M19 22H5v-2h14v2M13 2a3 3 0 00-3 3c0 .88.39 1.67 1 2.22V8l-3 1-2 4h2v1H6l-1 3h14l-1-3h-2v-1h2l-2-4-3-1V7.22c.61-.55 1-1.34 1-2.22a3 3 0 00-1-2.24V2h-1z",
    start: (slug, body) => api.importFromLichess(slug, body),
    iconBox: "bg-[#b05000]",
    chipOn: "border-[#b05000] bg-[#b05000] text-white",
    chipOff: "hover:border-[#b05000] hover:text-[#b05000]",
    selectFocus: "focus:border-orange-500 focus:ring-orange-500",
    submit: "bg-[#b05000] hover:bg-[#8f4200] focus:outline-none focus:ring-2 focus:ring-[#b05000] focus:ring-offset-1",
  },
};

interface OnlineImportSectionProps {
  platform: Platform;
  slug: string;
  accounts?: PlayerAccount[];
  onSuccess?: (job: ImportJob) => void;
  onUpdated?: () => void | Promise<void>;
}

/** Import a player's recent games from Chess.com or Lichess: one panel for both. */
export function OnlineImportSection({
  platform,
  slug,
  accounts = [],
  onSuccess,
  onUpdated,
}: OnlineImportSectionProps) {
  const site = SITES[platform];
  const siteAccounts = accounts.filter((a) => a.platform === platform);
  const [username, setUsername] = useState(siteAccounts[0]?.username || "");
  const [limit, setLimit] = useState(50);

  // The import runs in the worker service now, so this component holds a job
  // id and polls rather than awaiting a result. `matches` keeps this panel
  // showing this site's work only — a player can have a chess-results import
  // running at the same time.
  const { job, starting, error, start, cancel, reset, isRunning } = useImportJob({
    slug,
    matches: (j) => j.results?.[0]?.name?.startsWith(site.name) ?? false,
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
      () => site.start(slug, { username: username.trim(), limit }),
      "Import failed. Check the username and try again.",
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 dark:border-brand-800 dark:bg-dark-surface">
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${site.iconBox} text-white`}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d={site.icon} />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Import from {site.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Fetch the opponent&apos;s recent public games automatically
            </p>
          </div>
        </div>

        <form onSubmit={handleImport} className="space-y-4">
          {siteAccounts.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {siteAccounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { setUsername(a.username); reset(); }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    username === a.username
                      ? site.chipOn
                      : `border-gray-200 bg-white text-gray-600 ${site.chipOff} dark:border-dark-border dark:bg-dark-surface dark:text-gray-300`
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
                htmlFor={`${platform}-username`}
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {site.name} username
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                id={`${platform}-username`}
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); reset(); }}
                placeholder={site.placeholder}
                autoComplete="off"
                spellCheck={false}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-surface dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>

            <div className="w-full sm:w-32">
              <label
                htmlFor={`${platform}-limit`}
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Games to fetch
              </label>
              <select
                id={`${platform}-limit`}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className={`block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 ${site.selectFocus} focus:outline-none focus:ring-1 dark:border-dark-border dark:bg-dark-surface dark:text-gray-100`}
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
                  ? site.submit
                  : "cursor-not-allowed bg-gray-300 dark:bg-dark-muted dark:text-gray-400"
              }`}
            >
              {starting && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {starting ? "Queueing…" : isRunning ? "Import running…" : `Import from ${site.name}`}
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
          runningLabel={site.runningLabel}
        />
      </div>
      <ConnectedAccountManager
        slug={slug}
        platform={platform}
        accounts={accounts}
        onUpdated={onUpdated}
      />
    </div>
  );
}
