"use client";

import { useCallback, useEffect } from "react";
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
      className="group flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center transition-all hover:border-brand-300 hover:bg-brand-50/30"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-2xl text-gray-400 transition-colors group-hover:border-brand-400 group-hover:text-brand-500">
        +
      </div>
      <p className="text-sm font-semibold text-gray-600 group-hover:text-brand-600">
        Add Opponent
      </p>
      <p className="mt-1 text-xs text-gray-400">Create a new opponent profile</p>
    </Link>
  );
}

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { items, total, loading, error, searchQuery, ordering, currentPage } =
    useAppSelector((s) => s.players);

  useEffect(() => {
    dispatch(fetchPlayers({ search: searchQuery || undefined, page: currentPage, ordering }));
  }, [dispatch, searchQuery, currentPage, ordering]);

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
          <h1 className="mt-1 text-3xl font-bold text-gray-900">My Opponents</h1>
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
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => dispatch(setOrdering(opt.value))}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                ordering === opt.value
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : items.length > 0 ? (
        <>
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

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => dispatch(setCurrentPage(currentPage - 1))}
                disabled={currentPage <= 1}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 text-sm text-gray-500">
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
