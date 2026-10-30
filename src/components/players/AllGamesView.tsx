"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { gameRef } from "@/lib/gameRef";
import { GameFilters, NO_FILTERS, hasFilters, ratingParams, type GameFilterValues } from "./GameFilters";
import { GamesTable } from "./GamesTable";
import type { Game, PaginatedResponse } from "@/types";

interface AllGamesViewProps {
  slug: string;
}

const PAGE_SIZE = 20;

// ── Pagination ────────────────────────────────────────────────────────────────

function pageWindow(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const left = Math.max(2, page - 2);
  const right = Math.min(totalPages - 1, page + 2);
  if (left > 2) pages.push("…");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push("…");
  pages.push(totalPages);
  return pages;
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const btnBase =
    "min-w-[2rem] rounded-lg px-2 py-1.5 text-xs font-medium transition-colors";
  const active = `${btnBase} bg-brand-600 text-white`;
  const inactive = `${btnBase} text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-elevated`;
  const nav = `${btnBase} text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-dark-elevated`;

  return (
    <div className="mt-4 flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={nav}
      >
        ‹
      </button>

      {pageWindow(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={p === page ? active : inactive}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={nav}
      >
        ›
      </button>
    </div>
  );
}

export function AllGamesView({ slug }: AllGamesViewProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);

  function handleGameDeleted(gameId: string) {
    setGames((prev) => prev.filter((g) => gameRef(g) !== gameId));
    setTotal((prev) => prev - 1);
  }
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<GameFilterValues>(NO_FILTERS);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [filters]);

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
      })
      .then((data: PaginatedResponse<Game>) => {
        setGames(data.results);
        setTotal(data.count);
      })
      .catch(() => setError("Failed to load games."))
      .finally(() => setLoading(false));
  }, [slug, filters, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = hasFilters(filters);

  return (
    <div>
      <GameFilters
        value={filters}
        onChange={setFilters}
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
          <GamesTable games={games} onDeleted={handleGameDeleted} />

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
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
