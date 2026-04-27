"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAppSelector } from "@/redux/hooks";
import { api } from "@/lib/api";
import { getPreparedPlayerImportHref, prepareOpponent } from "@/lib/prepareOpponent";
import type { TournamentPlayer } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

type SortOption = "rating_desc" | "rating_asc" | "rank_asc" | "name_asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "rating_desc", label: "Rating: High to low" },
  { value: "rating_asc", label: "Rating: Low to high" },
  { value: "rank_asc", label: "Rank: Low to high" },
  { value: "name_asc", label: "Name: A to Z" },
];

function ratingBadge(rating: number | null) {
  if (!rating) return null;
  return (
    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium tabular-nums text-gray-600 dark:bg-dark-elevated dark:text-gray-300">
      {rating}
    </span>
  );
}

function compareNullableNumber(a: number | null, b: number | null, direction: "asc" | "desc") {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === "asc" ? a - b : b - a;
}

function sortPlayers(players: TournamentPlayer[], sortBy: SortOption): TournamentPlayer[] {
  return [...players].sort((a, b) => {
    if (sortBy === "rating_desc") {
      return (
        compareNullableNumber(a.rating, b.rating, "desc") ||
        compareNullableNumber(a.rank, b.rank, "asc") ||
        a.name.localeCompare(b.name)
      );
    }
    if (sortBy === "rating_asc") {
      return (
        compareNullableNumber(a.rating, b.rating, "asc") ||
        compareNullableNumber(a.rank, b.rank, "asc") ||
        a.name.localeCompare(b.name)
      );
    }
    if (sortBy === "rank_asc") {
      return (
        compareNullableNumber(a.rank, b.rank, "asc") ||
        compareNullableNumber(a.rating, b.rating, "desc") ||
        a.name.localeCompare(b.name)
      );
    }
    return a.name.localeCompare(b.name) || compareNullableNumber(a.rating, b.rating, "desc");
  });
}

// ── Player row ────────────────────────────────────────────────────────────────

function PlayerRow({
  player,
  onPrepare,
  preparing,
}: {
  player: TournamentPlayer;
  onPrepare: (player: TournamentPlayer) => void;
  preparing: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-dark-border dark:bg-dark-surface">
      {player.rank != null && (
        <span className="w-7 shrink-0 text-right text-sm font-medium tabular-nums text-gray-400 dark:text-gray-500">
          {player.rank}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-gray-100">{player.name}</span>
          {ratingBadge(player.rating)}
          {player.federation && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{player.federation}</span>
          )}
        </div>
        {player.score != null && (
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {player.score} pts
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onPrepare(player)}
        disabled={preparing}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {preparing ? (
          <>
            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Opening…
          </>
        ) : (
          "Prepare →"
        )}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TournamentPlayersPage() {
  const router = useRouter();
  const { active } = useAppSelector((s) => s.tournament);

  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("rating_desc");
  const [preparingSnr, setPreparingSnr] = useState<string | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);

  const isChessResults = (active?.url ?? "").includes("chess-results.com");

  // Seed from stored players_data — no network request needed on first load
  useEffect(() => {
    setPlayers(active?.players_data ?? []);
  }, [active?.players_data]);

  async function refresh() {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await api.refreshTournamentPlayers(active.id);
      setPlayers(updated.players_data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to refresh players");
    } finally {
      setLoading(false);
    }
  }

  async function handlePrepare(player: TournamentPlayer) {
    setPreparingSnr(player.snr);
    setPrepError(null);
    try {
      const slug = await prepareOpponent(player);
      router.push(getPreparedPlayerImportHref(slug));
    } catch (e: any) {
      setPrepError(e?.message ?? "Failed to open prep");
      setPreparingSnr(null);
    }
  }

  const visiblePlayers = sortPlayers(
    search.trim()
      ? players.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.federation ?? "").toLowerCase().includes(search.toLowerCase())
      )
      : players,
    sortBy
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            ← Back
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Tournament Mode
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {active?.name ?? "Tournament Players"}
          </h1>
          {active?.url && (
            <a
              href={active.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-xs text-gray-400 hover:underline dark:text-gray-500"
            >
              {active.url}
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-60 dark:border-dark-border dark:bg-dark-surface dark:text-gray-300 dark:hover:bg-dark-elevated"
        >
          {loading ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
            </svg>
          )}
          Refresh
        </button>
      </div>

      {/* Guard: no chess-results URL */}
      {!isChessResults && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          This tournament does not have a chess-results.com URL. Add one to enable player fetching.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {prepError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {prepError}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-dark-border dark:bg-dark-surface"
            />
          ))}
        </div>
      )}

      {/* Players list */}
      {!loading && players.length > 0 && (
        <>
          {/* Search + count */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or federation…"
              className="max-w-sm flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {visiblePlayers.length} player{visiblePlayers.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-2">
            {visiblePlayers.map((player) => (
              <PlayerRow
                key={player.snr}
                player={player}
                onPrepare={handlePrepare}
                preparing={preparingSnr === player.snr}
              />
            ))}
          </div>

          {visiblePlayers.length === 0 && (
            <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No players match your search.
            </p>
          )}
        </>
      )}

      {/* Empty state after load */}
      {!loading && !error && isChessResults && players.length === 0 && (
        <div className="mt-8 text-center space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No players found. Try refreshing — the standings may not have been available when the tournament was created.
          </p>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-dark-border dark:bg-dark-surface dark:text-gray-300"
          >
            Refresh now
          </button>
        </div>
      )}
    </div>
  );
}
