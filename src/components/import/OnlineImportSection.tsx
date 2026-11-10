"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { NotifyMeCheckbox, useNotifyMe } from "@/components/ui/NotifyMeCheckbox";
import { ConnectedAccountManager } from "./ConnectedAccountManager";
import { ImportElsewhereNote } from "./ImportElsewhereNote";
import { ImportJobProgress } from "./ImportJobProgress";
import { useImportJob } from "./useImportJob";
import type { ImportJob, OnlineImportRequest, PlayerAccount, TimeClass } from "@/types";

type Platform = "chesscom" | "lichess";

// The most one import can fetch: the server's ceiling (ONLINE_MAX_GAMES in the
// backend's import_entries.py). It fetches in pages of 1,000.
const ALL_GAMES = 10000;

/** "Games to fetch": a number of the newest games, or every game in a period. */
const FETCH_OPTIONS: { label: string; limit: number; sinceDays?: number }[] = [
  ...[25, 50, 100, 200, 500, 1000].map((n) => ({ label: n.toLocaleString("en"), limit: n })),
  { label: "Last 3 months", limit: ALL_GAMES, sinceDays: 90 },
  { label: "Last 12 months", limit: ALL_GAMES, sinceDays: 365 },
  { label: "All", limit: ALL_GAMES },
];
type FetchOption = (typeof FETCH_OPTIONS)[number];

const TIME_CLASSES: { id: TimeClass; label: string }[] = [
  { id: "bullet", label: "Bullet" },
  { id: "blitz", label: "Blitz" },
  { id: "rapid", label: "Rapid" },
  { id: "classical", label: "Classical" },
  { id: "daily", label: "Daily" },
];

/** What the chosen option will do, for the line under the form. Null when quick. */
function fetchNote(o: FetchOption): string | null {
  if (o.limit <= 200) return null;
  if (o.sinceDays) return `Every game from the ${o.label.toLowerCase()}, up to ${ALL_GAMES.toLocaleString("en")}. This can take a few minutes.`;
  if (o.limit === ALL_GAMES) return `Up to their newest ${ALL_GAMES.toLocaleString("en")} games. This can take ten minutes or so.`;
  return `${o.label} games take a minute or two.`;
}

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
    start: (slug: string, body: OnlineImportRequest) => ReturnType<typeof api.importFromChessCom>;
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
  const [choice, setChoice] = useState<FetchOption>(FETCH_OPTIONS[1]); // 50
  const [timeClasses, setTimeClasses] = useState<TimeClass[]>(TIME_CLASSES.map((t) => t.id));
  const [notifyEmail, setNotifyEmail] = useNotifyMe();
  const note = fetchNote(choice);

  function chooseFetch(label: string) {
    const option = FETCH_OPTIONS.find((o) => o.label === label) ?? FETCH_OPTIONS[1];
    setChoice(option);
    // "All" and the periods can take minutes: offer the email (they can untick it).
    if (option.limit === ALL_GAMES) setNotifyEmail(true);
  }

  function toggleTimeClass(id: TimeClass) {
    const on = timeClasses.includes(id);
    if (on && timeClasses.length === 1) return; // keep at least one
    setTimeClasses(TIME_CLASSES.map((t) => t.id).filter((t) => (t === id ? !on : timeClasses.includes(t))));
  }

  // The import runs in the worker service, so this component holds a job id
  // and polls rather than awaiting a result. `source` keeps this panel showing
  // this site's work only; `elsewhere` is another import for this player.
  const { job, starting, error, start, cancel, reset, isRunning, elsewhere } = useImportJob({
    slug,
    source: platform,
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
      () => site.start(slug, {
        username: username.trim(),
        limit: choice.limit,
        since_days: choice.sinceDays ?? null,
        time_classes: timeClasses,
        notify_email: notifyEmail,
      }),
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
                <Chip key={a.id} on={username === a.username} site={site} onClick={() => { setUsername(a.username); reset(); }}>
                  {a.username}
                </Chip>
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

            <div className="w-full sm:w-40">
              <label
                htmlFor={`${platform}-limit`}
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Games to fetch
              </label>
              <select
                id={`${platform}-limit`}
                value={choice.label}
                onChange={(e) => chooseFetch(e.target.value)}
                className={`block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 ${site.selectFocus} focus:outline-none focus:ring-1 dark:border-dark-border dark:bg-dark-surface dark:text-gray-100`}
              >
                {FETCH_OPTIONS.map((o) => (
                  <option key={o.label} value={o.label}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Time controls</legend>
            <div className="flex flex-wrap gap-1.5">
              {TIME_CLASSES.map((t) => (
                <Chip key={t.id} on={timeClasses.includes(t.id)} site={site} onClick={() => toggleTimeClass(t.id)}>
                  {t.label}
                </Chip>
              ))}
            </div>
          </fieldset>

          {note && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {note} You can leave this page; the import keeps going.
            </p>
          )}

          <NotifyMeCheckbox checked={notifyEmail} onChange={setNotifyEmail} />

          {elsewhere && !isRunning && <ImportElsewhereNote job={elsewhere} />}

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
              {starting ? "Queueing…" : isRunning ? "Import running…" : elsewhere ? "Add to queue" : `Import from ${site.name}`}
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

/** A round on/off button in the site's colour: saved accounts, time controls. */
function Chip({
  on,
  site,
  onClick,
  children,
}: {
  on: boolean;
  site: { chipOn: string; chipOff: string };
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        on
          ? site.chipOn
          : `border-gray-200 bg-white text-gray-600 ${site.chipOff} dark:border-dark-border dark:bg-dark-surface dark:text-gray-300`
      }`}
    >
      {children}
    </button>
  );
}
