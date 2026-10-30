"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { gameRef } from "@/lib/gameRef";
import { GamesTable } from "@/components/games/GamesTable";
import { Pagination } from "@/components/games/Pagination";
import { DEFAULT_PAGE_SIZE, rowFromGame } from "@/lib/games";
import { DeleteGameButton } from "./DeleteGameButton";
import { GameFilters, NO_FILTERS, hasFilters, ratingParams, type GameFilterValues } from "./GameFilters";
import type { Game, PaginatedResponse } from "@/types";

interface AllGamesViewProps {
  slug: string;
  /** The scouted player, for their side of each game. */
  playerName: string;
}

export function AllGamesView({ slug, playerName }: AllGamesViewProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);

  function handleGameDeleted(gameId: string) {
    setGames((prev) => prev.filter((g) => gameRef(g) !== gameId));
    setTotal((prev) => prev - 1);
  }
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<GameFilterValues>(NO_FILTERS);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const { color, result, source, year, rating, search } = filters;
    api
      .getPlayerGames(slug, {
        ...(color ? { color_played: color } : {}),
        ...(result ? { result } : {}),
        ...(source ? { source } : {}),
        ...(year ? { year } : {}),
        ...ratingParams(rating),
        ...(search ? { search } : {}),
        page,
        page_size: pageSize,
      })
      .then((data: PaginatedResponse<Game>) => {
        setGames(data.results);
        setTotal(data.count);
      })
      .catch(() => setError("Failed to load games."))
      .finally(() => setLoading(false));
  }, [slug, filters, page, pageSize]);

  const hasActiveFilters = hasFilters(filters);

  return (
    <div>
      <GameFilters
        value={filters}
        onChange={(f) => {
          // In the same render as the filter: page 5 of the old list may not
          // exist in the new one.
          setFilters(f);
          setPage(1);
        }}
        showRating
        searchPlaceholder="Search opponent, event, opening…"
        count={loading ? undefined : `${total} game${total !== 1 ? "s" : ""}`}
      />

      {/* Table */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-200 dark:bg-dark-elevated" />
          ))}
        </div>
      ) : games.length > 0 ? (
        <>
          <div className="flex flex-col gap-4 rounded-xl bg-ink-card p-4 sm:p-6">
            <GamesTable
              rows={games.map((g) => rowFromGame(g, playerName))}
              rowAction={(row) => <DeleteGameButton gameRef={row.key} onDeleted={handleGameDeleted} />}
            />
            <Pagination
              count={total}
              page={page}
              pageSize={pageSize}
              onChange={(p, size) => {
                setPage(p);
                setPageSize(size);
              }}
            />
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-dark-border">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {hasActiveFilters
              ? "No games match the current filters."
              : "No games found."}
          </p>
        </div>
      )}
    </div>
  );
}
