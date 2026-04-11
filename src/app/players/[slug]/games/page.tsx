"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGames, setGamesFilters, resetGamesFilters } from "@/store/slices/gamesSlice";
import { fetchPlayerDetail } from "@/store/slices/playerDetailSlice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { GamesTable } from "@/components/players/GamesTable";
import { OpeningTreeView } from "@/components/players/OpeningTreeView";
import { TableSkeleton } from "@/components/ui/LoadingSkeleton";
import type { ColorChoice, GameResult } from "@/types";

const SELECT_CLASS =
  "rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

type ViewMode = "list" | "openings";

export default function GamesPage() {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useAppDispatch();
  const { items, total, loading, error, filters } = useAppSelector((s) => s.games);
  const { player } = useAppSelector((s) => s.playerDetail);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  useEffect(() => {
    if (slug) {
      dispatch(fetchPlayerDetail(slug));
      dispatch(resetGamesFilters());
    }
  }, [dispatch, slug]);

  useEffect(() => {
    if (slug) {
      dispatch(fetchGames({ slug, filters }));
    }
  }, [dispatch, slug, filters]);

  const handleSearch = useCallback(
    (query: string) => {
      dispatch(setGamesFilters({ search: query, page: 1 }));
    },
    [dispatch]
  );

  const handlePageChange = (page: number) => {
    dispatch(setGamesFilters({ page }));
  };

  const totalPages = Math.ceil(total / 25);

  return (
    <div>
      <PageHeader
        title={player ? `${player.full_name} — Games` : "Games"}
        subtitle={viewMode === "list" ? `${total} game${total !== 1 ? "s" : ""} found` : "Browse by opening"}
        actions={
          player && (
            <Link href={`/players/${player.slug}`} className="btn-secondary text-sm">
              Back to profile
            </Link>
          )
        }
      />

      {/* View mode toggle */}
      <div className="mb-6 flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        <button
          onClick={() => setViewMode("list")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            viewMode === "list"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          All Games
        </button>
        <button
          onClick={() => setViewMode("openings")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            viewMode === "openings"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          By Opening
        </button>
      </div>

      {viewMode === "openings" && slug ? (
        <OpeningTreeView slug={slug} />
      ) : (
        <>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <SearchInput
              placeholder="Search by opponent, event, opening..."
              onSearch={handleSearch}
              defaultValue={filters.search}
              className="w-full sm:w-72"
            />

            <select
              value={filters.color_played}
              onChange={(e) =>
                dispatch(setGamesFilters({ color_played: e.target.value as ColorChoice | "", page: 1 }))
              }
              className={SELECT_CLASS}
            >
              <option value="">All colors</option>
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>

            <select
              value={filters.result}
              onChange={(e) =>
                dispatch(setGamesFilters({ result: e.target.value as GameResult | "", page: 1 }))
              }
              className={SELECT_CLASS}
            >
              <option value="">All results</option>
              <option value="win">Wins</option>
              <option value="draw">Draws</option>
              <option value="loss">Losses</option>
            </select>

            <select
              value={filters.opening_family || ""}
              onChange={(e) =>
                dispatch(setGamesFilters({ opening_family: e.target.value || undefined, page: 1 }))
              }
              className={SELECT_CLASS}
            >
              <option value="">All openings</option>
              <option value="Sicilian">Sicilian</option>
              <option value="Slav / Semi-Slav">Slav / Semi-Slav</option>
              <option value="QGD / Nimzo">QGD / Nimzo</option>
              <option value="King's Indian">King's Indian</option>
              <option value="Ruy Lopez">Ruy Lopez</option>
              <option value="French">French</option>
              <option value="Flank / Indian Systems">Flank / Indian</option>
            </select>
          </div>

          {loading ? (
            <TableSkeleton rows={8} />
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <GamesTable games={items} />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange((filters.page || 1) - 1)}
                disabled={!filters.page || filters.page <= 1}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 text-sm text-gray-500">
                Page {filters.page || 1} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange((filters.page || 1) + 1)}
                disabled={(filters.page || 1) >= totalPages}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
