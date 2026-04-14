"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { FederationSelect } from "@/components/ui/FederationSelect";
import type { PlayerLookupResult } from "@/types";

type Platform = "chesscom" | "lichess" | "fide";

const PLATFORMS: { id: Platform; label: string; color: string; icon: React.ReactNode }[] = [
  {
    id: "fide",
    label: "FIDE",
    color: "#1a56db",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15H9V8h2v9zm4 0h-2V8h2v9z" />
      </svg>
    ),
  },
  {
    id: "chesscom",
    label: "Chess.com",
    color: "#7fa650",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M10 2a1 1 0 00-1 1v1H8a3 3 0 00-3 3v1H4a1 1 0 000 2h1v1a3 3 0 003 3h.17l-1.9 4.55A1 1 0 007.2 20h9.6a1 1 0 00.93-1.45L15.83 14H16a3 3 0 003-3v-1h1a1 1 0 000-2h-1V7a3 3 0 00-3-3h-1V3a1 1 0 00-1-1h-4z" />
      </svg>
    ),
  },
  {
    id: "lichess",
    label: "Lichess",
    color: "#b05000",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M19 22H5v-2h14v2M13 2a3 3 0 00-3 3c0 .88.39 1.67 1 2.22V8l-3 1-2 4h2v1H6l-1 3h14l-1-3h-2v-1h2l-2-4-3-1V7.22c.61-.55 1-1.34 1-2.22a3 3 0 00-1-2.24V2h-1z" />
      </svg>
    ),
  },
];

function RatingBadge({ label, value }: { label: string; value?: number }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-600 dark:text-gray-300">
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
  const platform = PLATFORMS.find((p) => p.id === result.platform);
  const ratings = result.ratings ?? {};

  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-brand-400 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-brand-500 dark:hover:bg-brand-900/20"
    >
      {/* Avatar */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-600">
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

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {result.title && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
              {result.title}
            </span>
          )}
          <span className="truncate font-medium text-gray-900 dark:text-gray-100">{result.display_name}</span>
          {result.username && result.username !== result.display_name && (
            <span className="truncate text-sm text-gray-400">@{result.username}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {/* Platform badge */}
          <span
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: platform?.color ?? "#888" }}
          >
            {platform?.icon}
            {platform?.label}
          </span>
          {result.federation && (
            <span className="text-xs text-gray-400">{result.federation}</span>
          )}
          {result.country && !result.federation && (
            <span className="text-xs text-gray-400">{result.country}</span>
          )}
          {result.fide_id && (
            <span className="text-xs text-gray-400">FIDE {result.fide_id}</span>
          )}
          {/* Ratings */}
          <RatingBadge label="Std" value={ratings.standard} />
          <RatingBadge label="Rapid" value={ratings.rapid} />
          <RatingBadge label="Blitz" value={ratings.blitz} />
          <RatingBadge label="Bullet" value={ratings.bullet} />
          <RatingBadge label="Classical" value={ratings.classical} />
        </div>
      </div>

      {/* Select hint */}
      <span className="flex-shrink-0 text-xs text-brand-600 font-medium">Select →</span>
    </button>
  );
}

function MultiUsernameInput({
  platform,
  color,
  label,
  icon,
  usernames,
  onChange,
}: {
  platform: string;
  color: string;
  label: string;
  icon: React.ReactNode;
  usernames: string[];
  onChange: (values: string[]) => void;
}) {
  function update(idx: number, value: string) {
    const next = [...usernames];
    next[idx] = value;
    onChange(next);
  }

  function remove(idx: number) {
    const next = usernames.filter((_, i) => i !== idx);
    onChange(next.length ? next : [""]);
  }

  function addSlot() {
    onChange([...usernames, ""]);
  }

  const showAdd = usernames.every((u) => u.trim()) && usernames.length < 5;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        <span
          className="flex h-4 w-4 items-center justify-center rounded text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </span>
        {label}
        <span className="text-xs font-normal text-gray-400">optional</span>
      </div>
      <div className="space-y-2">
        {usernames.map((u, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <input
              type="text"
              value={u}
              onChange={(e) => update(idx, e.target.value)}
              className="block flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              placeholder="username"
              autoComplete="off"
              spellCheck={false}
            />
            {usernames.length > 1 && (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                aria-label="Remove"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                </svg>
              </button>
            )}
          </div>
        ))}
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


export default function NewPlayerPage() {
  const router = useRouter();

  // ── Search state ────────────────────────────────────────────────────────────
  const [searchPlatform, setSearchPlatform] = useState<Platform>("fide");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlayerLookupResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [nameLocked, setNameLocked] = useState(false);
  const [federation, setFederation] = useState("");
  const [fideId, setFideId] = useState("");
  const [chesscomUsernames, setChesscomUsernames] = useState<string[]>([""]);
  const [lichessUsernames, setLichessUsernames] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setSearching(true);
    setSearchResults(null);
    setSearchError(null);
    try {
      const { results } = await api.lookupPlayer(searchPlatform, q);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError(
          `No ${PLATFORMS.find((p) => p.id === searchPlatform)?.label} user found for "${q}".`
        );
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  function addUsernameToList(
    list: string[],
    setList: (v: string[]) => void,
    username: string
  ) {
    const lower = username.toLowerCase();
    if (list.map((u) => u.toLowerCase()).includes(lower)) return; // already present
    // Fill first empty slot or append
    const emptyIdx = list.findIndex((u) => !u.trim());
    if (emptyIdx !== -1) {
      const next = [...list];
      next[emptyIdx] = username;
      setList(next);
    } else {
      setList([...list, username]);
    }
  }

  function handleSelectResult(result: PlayerLookupResult) {
    if (result.platform === "chesscom" && result.username) {
      addUsernameToList(chesscomUsernames, setChesscomUsernames, result.username);
      if (result.display_name && !nameLocked) setFullName(result.display_name);
    }
    if (result.platform === "lichess" && result.username) {
      addUsernameToList(lichessUsernames, setLichessUsernames, result.username);
      if (result.display_name && !nameLocked) setFullName(result.display_name);
    }
    if (result.platform === "fide") {
      if (result.fide_id) setFideId(result.fide_id);
      if (result.federation) setFederation(result.federation);
      if (result.display_name) {
        setFullName(result.display_name);
        setNameLocked(true);
      }
    }
    setSearchResults(null);
    setSearchQuery("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const accounts: { platform: "chesscom" | "lichess"; username: string }[] = [
        ...chesscomUsernames.filter((u) => u.trim()).map((u) => ({ platform: "chesscom" as const, username: u.trim() })),
        ...lichessUsernames.filter((u) => u.trim()).map((u) => ({ platform: "lichess" as const, username: u.trim() })),
      ];
      const player = await api.createPlayer({
        full_name: fullName.trim(),
        ...(federation.trim() ? { federation: federation.trim() } : {}),
        ...(fideId.trim() ? { fide_id: fideId.trim() } : {}),
        ...(accounts.length ? { accounts } : {}),
      });
const hasChesscom = chesscomUsernames.some((u) => u.trim());
      const hasLichess = lichessUsernames.some((u) => u.trim());
      const source = hasChesscom ? "chesscom" : hasLichess ? "lichess" : "chesscom";
      router.push(`/players/${player.public_id}/import?source=${source}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create player. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

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
          Search by username or name to auto-fill, or fill in the details manually.
        </p>
      </div>

      {/* ── Search section ─────────────────────────────────────────────────── */}
      <div className="card mb-4 p-5">
        <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Search player</p>

        {/* Platform tabs */}
        <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSearchPlatform(p.id);
                setSearchResults(null);
                setSearchError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                searchPlatform === p.id
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <span style={{ color: searchPlatform === p.id ? p.color : undefined }}>
                {p.icon}
              </span>
              {p.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (searchResults || searchError) {
                setSearchResults(null);
                setSearchError(null);
              }
            }}
            placeholder={
              searchPlatform === "fide"
                ? "Search by name, e.g. Magnus Carlsen"
                : searchPlatform === "chesscom"
                ? "Username, e.g. MagnusCarlsen"
                : "Username, e.g. DrNykterstein"
            }
            className="block flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-60"
          >
            {searching ? (
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

        {/* Search error */}
        {searchError && (
          <p className="mt-2 text-sm text-gray-500">{searchError}</p>
        )}

        {/* Results */}
        {searchResults && searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-400">
              {searchResults.length === 1 ? "1 result — click to pre-fill" : `${searchResults.length} results — click to pre-fill`}
            </p>
            {searchResults.map((r, i) => (
              <LookupResultCard key={i} result={r} onSelect={handleSelectResult} />
            ))}
          </div>
        )}
      </div>

      {/* ── Manual form ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Player details</p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Full name */}
        <div>
          <label htmlFor="full-name" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            Full name <span className="text-red-500">*</span>
            {nameLocked && (
              <span className="ml-auto flex items-center gap-1 text-xs font-normal text-[#1a56db]">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                  <path fillRule="evenodd" d="M8 1a3.5 3.5 0 00-3.5 3.5V6H4a2 2 0 00-2 2v5a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2h-.5V4.5A3.5 3.5 0 008 1zm2 5V4.5a2 2 0 10-4 0V6h4z" clipRule="evenodd" />
                </svg>
                From FIDE ·{" "}
                <button
                  type="button"
                  onClick={() => setNameLocked(false)}
                  className="underline underline-offset-2 hover:text-blue-800"
                >
                  unlock
                </button>
              </span>
            )}
          </label>
          <input
            id="full-name"
            type="text"
            required
            autoFocus
            readOnly={nameLocked}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={`block w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
              nameLocked
                ? "border-[#1a56db]/30 bg-blue-50 text-gray-700 focus:border-[#1a56db] focus:ring-[#1a56db] cursor-default select-none dark:bg-blue-900/20 dark:text-gray-300"
                : "border-gray-300 bg-white focus:border-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            }`}
            placeholder="e.g. Magnus Carlsen"
          />
        </div>

        {/* Chess.com accounts */}
        <MultiUsernameInput
          platform="chesscom"
          color="#7fa650"
          label="Chess.com"
          icon={
            <svg viewBox="0 0 24 24" fill="white" className="h-2.5 w-2.5">
              <path d="M10 2a1 1 0 00-1 1v1H8a3 3 0 00-3 3v1H4a1 1 0 000 2h1v1a3 3 0 003 3h.17l-1.9 4.55A1 1 0 007.2 20h9.6a1 1 0 00.93-1.45L15.83 14H16a3 3 0 003-3v-1h1a1 1 0 000-2h-1V7a3 3 0 00-3-3h-1V3a1 1 0 00-1-1h-4z" />
            </svg>
          }
          usernames={chesscomUsernames}
          onChange={setChesscomUsernames}
        />

        {/* Lichess accounts */}
        <MultiUsernameInput
          platform="lichess"
          color="#b05000"
          label="Lichess"
          icon={
            <svg viewBox="0 0 24 24" fill="white" className="h-2.5 w-2.5">
              <path d="M19 22H5v-2h14v2M13 2a3 3 0 00-3 3c0 .88.39 1.67 1 2.22V8l-3 1-2 4h2v1H6l-1 3h14l-1-3h-2v-1h2l-2-4-3-1V7.22c.61-.55 1-1.34 1-2.22a3 3 0 00-1-2.24V2h-1z" />
            </svg>
          }
          usernames={lichessUsernames}
          onChange={setLichessUsernames}
        />

        {/* Federation + FIDE ID */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="federation" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Federation
              <span className="ml-1 text-xs font-normal text-gray-400">optional</span>
            </label>
            <FederationSelect
              id="federation"
              value={federation}
              onChange={setFederation}
            />
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
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              placeholder="e.g. 1503014"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !fullName.trim()}
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
