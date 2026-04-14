"use client";

import { useCallback, useEffect } from "react";

import { PlayerCard } from "@/components/players/PlayerCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPlayers, setSearchQuery, setCurrentPage } from "@/store/slices/playersSlice";

const PAGE_SIZE = 25;

export default function PlayersPage() {
  const dispatch = useAppDispatch();
  const { items, total, loading, error, searchQuery, currentPage } = useAppSelector(
    (state) => state.players
  );

  useEffect(() => {
    dispatch(fetchPlayers({ search: searchQuery || undefined, page: currentPage }));
  }, [dispatch, searchQuery, currentPage]);

  const handleSearch = useCallback(
    (query: string) => {
      dispatch(setSearchQuery(query));
    },
    [dispatch]
  );

  const handlePlayerDeleted = useCallback(() => {
    dispatch(fetchPlayers({ search: searchQuery || undefined, page: currentPage }));
  }, [dispatch, searchQuery, currentPage]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Players"
        subtitle={`${total} player${total !== 1 ? "s" : ""} tracked.`}
      />

      <div className="mb-8">
        <SearchInput
          placeholder="Search by name or federation..."
          onSearch={handleSearch}
          defaultValue={searchQuery}
          className="max-w-xl"
        />
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              showDelete
              onDeleted={handlePlayerDeleted}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No players found"
          description="Try adjusting your search query."
        />
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
    </div>
  );
}
