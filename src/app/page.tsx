"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { PlayerCard } from "@/components/players/PlayerCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchPlayers,
  setSearchQuery,
  setOrdering,
  setCurrentPage,
  type PlayerOrdering,
} from "@/store/slices/playersSlice";
import type { Player } from "@/types";

const PAGE_SIZE = 25;
const PLAYER_VIEW_STORAGE_KEY = "players_view_mode";

type PlayerViewMode = "card" | "list";

const SORT_OPTIONS: { value: PlayerOrdering; label: string }[] = [
  { value: "-created_at",      label: "Recently added" },
  { value: "created_at",       label: "Oldest first" },
  { value: "full_name",        label: "Name A–Z" },
  { value: "-standard_rating", label: "Highest rated" },
];

function AddOpponentCard() {
  return (
    <Link
      href="/players/new"
      className="group flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center transition-all hover:border-brand-300 hover:bg-brand-50/30 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-2xl text-gray-400 transition-colors group-hover:border-brand-400 group-hover:text-brand-500 dark:border-gray-600 dark:text-gray-500">
        +
      </div>
      <p className="text-sm font-semibold text-gray-600 group-hover:text-brand-600 dark:text-gray-400 dark:group-hover:text-brand-400">
        Add Opponent
      </p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Create a new opponent profile</p>
    </Link>
  );
}

function AddOpponentListRow() {
  return (
    <Link
      href="/players/new"
      className="group flex items-center justify-between rounded-xl border border-dashed border-gray-300 bg-white px-5 py-4 transition-all hover:border-brand-300 hover:bg-brand-50/30 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-2xl text-gray-400 transition-colors group-hover:border-brand-400 group-hover:text-brand-500 dark:border-gray-600 dark:text-gray-500">
          +
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 group-hover:text-brand-700 dark:text-gray-300 dark:group-hover:text-brand-400">
            Add Opponent
          </p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            Create a new opponent profile
          </p>
        </div>
      </div>
      <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
        New →
      </span>
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="card border-gray-200 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="min-w-0 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-56 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
        <div className="h-10 w-28 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { items, total, loading, error, searchQuery, ordering, currentPage } =
    useAppSelector((s) => s.players);
  const [viewMode, setViewMode] = useState<PlayerViewMode>("list");

  useEffect(() => {
    dispatch(fetchPlayers({ search: searchQuery || undefined, page: currentPage, ordering }));
  }, [dispatch, searchQuery, currentPage, ordering]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedMode = window.localStorage.getItem(PLAYER_VIEW_STORAGE_KEY);
    if (savedMode === "card" || savedMode === "list") {
      setViewMode(savedMode);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PLAYER_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const handleSearch = useCallback(
    (query: string) => {
      dispatch(setSearchQuery(query));
    },
    [dispatch]
  );

  const handlePlayerDeleted = useCallback(
    (_player: Player) => {
      dispatch(fetchPlayers({ search: searchQuery || undefined, page: currentPage, ordering }));
    },
    [dispatch, searchQuery, currentPage, ordering]
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Scouting
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">My Opponents</h1>
        </div>
        <Link href="/players/new" className="btn-primary">
          + Add Opponent
        </Link>
      </div>

      {/* Search + sort */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by name or federation…"
          onSearch={handleSearch}
          defaultValue={searchQuery}
          className="max-w-xl flex-1"
        />
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
            {([
              {
                value: "card" as const,
                label: "Cards",
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" />
                  </svg>
                ),
              },
              {
                value: "list" as const,
                label: "List",
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M3 4.5A1.5 1.5 0 114.5 6 1.5 1.5 0 013 4.5zm0 5A1.5 1.5 0 114.5 11 1.5 1.5 0 013 9.5zm0 5A1.5 1.5 0 114.5 16 1.5 1.5 0 013 14.5zM7 5h10v2H7V5zm0 5h10v2H7v-2zm0 5h10v2H7v-2z" />
                  </svg>
                ),
              },
            ]).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setViewMode(option.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === option.value
                    ? "bg-brand-600 text-white"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => dispatch(setOrdering(opt.value))}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  ordering === opt.value
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        viewMode === "card" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ListSkeleton key={i} />
            ))}
          </div>
        )
      ) : items.length > 0 ? (
        <>
          {viewMode === "card" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  showDelete
                  onDeleted={handlePlayerDeleted}
                />
              ))}
              <AddOpponentCard />
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  showDelete
                  onDeleted={handlePlayerDeleted}
                  variant="list"
                />
              ))}
              <AddOpponentListRow />
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => dispatch(setCurrentPage(currentPage - 1))}
                disabled={currentPage <= 1}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 text-sm text-gray-500 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => dispatch(setCurrentPage(currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title={searchQuery ? "No opponents found" : "No opponents yet"}
          description={
            searchQuery
              ? "Try adjusting your search."
              : "Add your first opponent to get started."
          }
        />
      )}
    </div>
  );
}
