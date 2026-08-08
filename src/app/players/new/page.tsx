"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { FederationSelect } from "@/components/ui/FederationSelect";
import type { PlayerLookupResult } from "@/types";

// ── Platform metadata ────────────────────────────────────────────────────────

const FIDE_COLOR = "#1a56db";
const CC_COLOR = "#7fa650";
const LI_COLOR = "#b05000";

const PLATFORM_META = {
  fide:     { label: "FIDE",      color: FIDE_COLOR },
  chesscom: { label: "Chess.com", color: CC_COLOR   },
  lichess:  { label: "Lichess",   color: LI_COLOR   },
} as const;

// ── Small helpers ────────────────────────────────────────────────────────────

function RatingBadge({ label, value }: { label: string; value?: number }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-dark-muted dark:text-gray-300">
      <span className="font-medium text-gray-400">{label}</span>
      {value}
    </span>
  );
}

function LookupResultCard({
  result,
  onSelect,
}: {
  result: PlayerLookupResult;
  onSelect: (r: PlayerLookupResult) => void;
}) {
  const meta = PLATFORM_META[result.platform];
  const ratings = result.ratings ?? {};

  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-brand-400 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:hover:border-brand-500 dark:hover:bg-brand-900/20"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-dark-muted">
        {result.avatar_url ? (
          <Image
            src={result.avatar_url}
            alt={result.display_name}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <span className="text-lg font-semibold text-gray-400">
            {result.display_name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {result.title && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
              {result.title}
            </span>
          )}
          <span className="truncate font-medium text-gray-900 dark:text-gray-100">
            {result.display_name}
          </span>
          {result.username && result.username !== result.display_name && (
            <span className="truncate text-sm text-gray-400">@{result.username}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: meta?.color ?? "#888" }}
          >
            {meta?.label}
          </span>
          {result.federation && <span className="text-xs text-gray-400">{result.federation}</span>}
          {result.country && !result.federation && <span className="text-xs text-gray-400">{result.country}</span>}
          {result.fide_id && <span className="text-xs text-gray-400">FIDE {result.fide_id}</span>}
          <RatingBadge label="Std" value={ratings.standard} />
          <RatingBadge label="Rapid" value={ratings.rapid} />
          <RatingBadge label="Blitz" value={ratings.blitz} />
          <RatingBadge label="Bullet" value={ratings.bullet} />
          <RatingBadge label="Classical" value={ratings.classical} />
        </div>
      </div>

      <span className="flex-shrink-0 text-xs font-medium text-brand-600">Select →</span>
    </button>
  );
}

// ── Per-platform username field with inline lookup ───────────────────────────

function PlatformUsernameSection({
  platform,
  color,
  label,
  icon,
  placeholder,
  usernames,
  onChange,
  onFound,
}: {
  platform: "chesscom" | "lichess";
  color: string;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  usernames: string[];
  onChange: (values: string[]) => void;
  onFound: (result: PlayerLookupResult) => void;
}) {
  const [lookupStates, setLookupStates] = useState<
    Record<number, { loading: boolean; result: PlayerLookupResult | null; error: string | null }>
  >({});

  function update(idx: number, value: string) {
    const next = [...usernames];
    next[idx] = value;
    onChange(next);
    // Clear lookup result when user edits the field
    setLookupStates((prev) => ({ ...prev, [idx]: { loading: false, result: null, error: null } }));
  }

  function remove(idx: number) {
    const next = usernames.filter((_, i) => i !== idx);
    onChange(next.length ? next : [""]);
    setLookupStates((prev) => {
      const updated: typeof prev = {};
      Object.keys(prev).forEach((k) => {
        const n = Number(k);
        if (n < idx) updated[n] = prev[n];
        else if (n > idx) updated[n - 1] = prev[n];
      });
      return updated;
    });
  }

  function addSlot() {
    onChange([...usernames, ""]);
  }

  async function lookup(idx: number) {
    const username = usernames[idx]?.trim();
    if (!username) return;
    setLookupStates((prev) => ({ ...prev, [idx]: { loading: true, result: null, error: null } }));
    try {
      const { results } = await api.lookupPlayer(platform, username);
      if (results.length > 0) {
        setLookupStates((prev) => ({ ...prev, [idx]: { loading: false, result: results[0], error: null } }));
      } else {
        setLookupStates((prev) => ({ ...prev, [idx]: { loading: false, result: null, error: `No ${label} user found for "${username}".` } }));
      }
    } catch {
      setLookupStates((prev) => ({ ...prev, [idx]: { loading: false, result: null, error: "Lookup failed. Check the username." } }));
    }
  }

  function confirmResult(idx: number, result: PlayerLookupResult) {
    onFound(result);
    setLookupStates((prev) => ({ ...prev, [idx]: { loading: false, result: null, error: null } }));
  }

  const showAdd = usernames.every((u) => u.trim()) && usernames.length < 5;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        <span className="flex h-4 w-4 items-center justify-center rounded text-white" style={{ backgroundColor: color }}>
          {icon}
        </span>
        {label}
        <span className="text-xs font-normal text-gray-400">optional</span>
      </div>

      <div className="space-y-2">
        {usernames.map((u, idx) => {
          const state = lookupStates[idx];
          return (
            <div key={idx}>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={u}
                  onChange={(e) => update(idx, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(idx); } }}
                  className="block flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500"
                  placeholder={placeholder}
                  autoComplete="off"
                  spellCheck={false}
                />
                {/* Lookup button */}
                <button
                  type="button"
                  onClick={() => lookup(idx)}
                  disabled={!u.trim() || state?.loading}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 disabled:opacity-40 dark:border-dark-border dark:hover:border-gray-500"
                  aria-label={`Look up on ${label}`}
                  title={`Look up on ${label}`}
                >
                  {state?.loading ? (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                {/* Remove button */}
                {usernames.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-dark-border"
                    aria-label="Remove"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Inline result */}
              {state?.result && (
                <div className="mt-1.5">
                  <LookupResultCard result={state.result} onSelect={(r) => confirmResult(idx, r)} />
                </div>
              )}
              {state?.error && (
                <p className="mt-1 text-xs text-gray-500">{state.error}</p>
              )}
            </div>
          );
        })}

        {showAdd && (
          <button
            type="button"
            onClick={addSlot}
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
            </svg>
            Add another {label} account
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewPlayerPage() {
  const router = useRouter();

  // ── FIDE search state ────────────────────────────────────────────────────
  const [fideQuery, setFideQuery] = useState("");
  const [fideSearching, setFideSearching] = useState(false);
  const [fideResults, setFideResults] = useState<PlayerLookupResult[] | null>(null);
  const [fideError, setFideError] = useState<string | null>(null);
  const [fideSelected, setFideSelected] = useState<PlayerLookupResult | null>(null);
  const fideInputRef = useRef<HTMLInputElement>(null);

  // ── Form state ───────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [federation, setFederation] = useState("");
  const [fideId, setFideId] = useState("");
  const [chesscomUsernames, setChesscomUsernames] = useState<string[]>([""]);
  const [lichessUsernames, setLichessUsernames] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── FIDE search ──────────────────────────────────────────────────────────

  async function handleFideSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = fideQuery.trim();
    if (!q) return;
    setFideSearching(true);
    setFideResults(null);
    setFideError(null);
    try {
      const { results } = await api.lookupPlayer("fide", q);
      if (results.length === 0) {
        setFideError(`No FIDE player found for "${q}".`);
      } else {
        setFideResults(results);
      }
    } catch (err) {
      // The API explains short queries and FIDE outages — pass that through
      // rather than flattening both to "try again".
      setFideError(err instanceof Error ? err.message : "FIDE search failed. Try again.");
    } finally {
      setFideSearching(false);
    }
  }

  function handleSelectFide(result: PlayerLookupResult) {
    if (result.fide_id) setFideId(result.fide_id);
    if (result.federation) setFederation(result.federation);
    if (result.display_name) setFullName(result.display_name);
    setFideSelected(result);
    setFideResults(null);
    setFideQuery("");
  }

  function clearFideSelection() {
    setFideSelected(null);
    setFideId("");
    setFederation("");
    setFullName("");
    setTimeout(() => fideInputRef.current?.focus(), 0);
  }

  // ── Chess.com / Lichess found callback ───────────────────────────────────

  function handlePlatformFound(result: PlayerLookupResult) {
    if (!fullName && result.display_name) setFullName(result.display_name);
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  const hasAnyIdentifier =
    fideId.trim() ||
    chesscomUsernames.some((u) => u.trim()) ||
    lichessUsernames.some((u) => u.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasAnyIdentifier) return;

    const derivedName =
      fullName.trim() ||
      chesscomUsernames.find((u) => u.trim()) ||
      lichessUsernames.find((u) => u.trim()) ||
      fideId.trim() ||
      "";
    if (!derivedName) return;

    setLoading(true);
    setError(null);
    try {
      const accounts: { platform: "chesscom" | "lichess"; username: string }[] = [
        ...chesscomUsernames.filter((u) => u.trim()).map((u) => ({ platform: "chesscom" as const, username: u.trim() })),
        ...lichessUsernames.filter((u) => u.trim()).map((u) => ({ platform: "lichess" as const, username: u.trim() })),
      ];
      const player = await api.createPlayer({
        full_name: derivedName,
        ...(federation.trim() ? { federation: federation.trim() } : {}),
        ...(fideId.trim() ? { fide_id: fideId.trim() } : {}),
        ...(accounts.length ? { accounts } : {}),
      });
      const hasChesscom = chesscomUsernames.some((u) => u.trim());
      const hasLichess = lichessUsernames.some((u) => u.trim());
      const source = hasChesscom ? "chesscom" : hasLichess ? "lichess" : "chess_results";
      router.push(`/players/${player.public_id}/import?source=${source}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create player. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:text-gray-900">My Opponents</Link>
        <span>/</span>
        <span className="text-gray-900">Add Opponent</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add opponent</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Search FIDE by name, or enter their Chess.com / Lichess username directly.
        </p>
      </div>

      {/* ── FIDE search ──────────────────────────────────────────────────── */}
      <div className="card mb-4 p-5">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex h-4 w-4 items-center justify-center rounded text-white" style={{ backgroundColor: FIDE_COLOR }}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15H9V8h2v9zm4 0h-2V8h2v9z" />
            </svg>
          </span>
          FIDE search
          <span className="text-xs font-normal text-gray-400">by name</span>
        </div>

        {/* Selected FIDE player indicator */}
        {fideSelected ? (
          <div className="flex items-center gap-3 rounded-lg border border-[#1a56db]/30 bg-[#1a56db]/5 px-4 py-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1a56db]/10 text-xs font-bold text-[#1a56db]">
              {fideSelected.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {fideSelected.title && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                    {fideSelected.title}
                  </span>
                )}
                <span className="font-medium text-gray-900 dark:text-gray-100">{fideSelected.display_name}</span>
                <span className="rounded bg-[#1a56db] px-1.5 py-0.5 text-xs font-medium text-white">FIDE</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {fideSelected.fide_id && <span>#{fideSelected.fide_id}</span>}
                {fideSelected.federation && <span>{fideSelected.federation}</span>}
                {fideSelected.ratings?.standard && <span>Std {fideSelected.ratings.standard}</span>}
                {fideSelected.ratings?.rapid && <span>Rapid {fideSelected.ratings.rapid}</span>}
                {fideSelected.ratings?.blitz && <span>Blitz {fideSelected.ratings.blitz}</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={clearFideSelection}
              className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
            >
              Change
            </button>
          </div>
        ) : (
          <form onSubmit={handleFideSearch} className="flex gap-2">
            <input
              ref={fideInputRef}
              type="text"
              value={fideQuery}
              onChange={(e) => {
                setFideQuery(e.target.value);
                if (fideResults || fideError) { setFideResults(null); setFideError(null); }
              }}
              placeholder="e.g. Magnus Carlsen"
              className="block flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
            <button
              type="submit"
              disabled={fideSearching || !fideQuery.trim()}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-60"
            >
              {fideSearching ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Searching…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                  </svg>
                  Search
                </>
              )}
            </button>
          </form>
        )}

        {fideError && <p className="mt-2 text-sm text-gray-500">{fideError}</p>}

        {fideResults && fideResults.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-400">
              {fideResults.length === 1 ? "1 result" : `${fideResults.length} results`} — click to pre-fill
            </p>
            {fideResults.map((r, i) => (
              <LookupResultCard key={i} result={r} onSelect={handleSelectFide} />
            ))}
          </div>
        )}
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Player details</p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Chess.com */}
        <PlatformUsernameSection
          platform="chesscom"
          color={CC_COLOR}
          label="Chess.com"
          placeholder="username, e.g. MagnusCarlsen"
          icon={
            <svg viewBox="0 0 24 24" fill="white" className="h-2.5 w-2.5">
              <path d="M10 2a1 1 0 00-1 1v1H8a3 3 0 00-3 3v1H4a1 1 0 000 2h1v1a3 3 0 003 3h.17l-1.9 4.55A1 1 0 007.2 20h9.6a1 1 0 00.93-1.45L15.83 14H16a3 3 0 003-3v-1h1a1 1 0 000-2h-1V7a3 3 0 00-3-3h-1V3a1 1 0 00-1-1h-4z" />
            </svg>
          }
          usernames={chesscomUsernames}
          onChange={setChesscomUsernames}
          onFound={handlePlatformFound}
        />

        {/* Lichess */}
        <PlatformUsernameSection
          platform="lichess"
          color={LI_COLOR}
          label="Lichess"
          placeholder="username, e.g. DrNykterstein"
          icon={
            <svg viewBox="0 0 24 24" fill="white" className="h-2.5 w-2.5">
              <path d="M19 22H5v-2h14v2M13 2a3 3 0 00-3 3c0 .88.39 1.67 1 2.22V8l-3 1-2 4h2v1H6l-1 3h14l-1-3h-2v-1h2l-2-4-3-1V7.22c.61-.55 1-1.34 1-2.22a3 3 0 00-1-2.24V2h-1z" />
            </svg>
          }
          usernames={lichessUsernames}
          onChange={setLichessUsernames}
          onFound={handlePlatformFound}
        />

        {/* Federation + FIDE ID */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="federation" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Federation
              <span className="ml-1 text-xs font-normal text-gray-400">optional</span>
            </label>
            <FederationSelect id="federation" value={federation} onChange={setFederation} />
          </div>
          <div>
            <label htmlFor="fide-id" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              FIDE ID
              <span className="ml-1 text-xs font-normal text-gray-400">optional</span>
            </label>
            <input
              id="fide-id"
              type="text"
              value={fideId}
              onChange={(e) => setFideId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500"
              placeholder="e.g. 1503014"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !hasAnyIdentifier}
            className="btn-primary disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create & import games →"}
          </button>
          <Link href="/" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
