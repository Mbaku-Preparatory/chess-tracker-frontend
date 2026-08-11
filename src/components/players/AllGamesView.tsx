"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GamesTable } from "./GamesTable";
import type { Game, GameResult, GameSource, ColorChoice, PaginatedResponse } from "@/types";

interface AllGamesViewProps {
  slug: string;
}

const SOURCE_OPTIONS: { value: GameSource | ""; label: string }[] = [
  { value: "", label: "All sources" },
  { value: "chess_results", label: "Chess-Results (OTB)" },
  { value: "chess_com", label: "Chess.com" },
  { value: "lichess", label: "Lichess" },
  { value: "pgn_import", label: "PGN import" },
  { value: "manual", label: "Manual" },
];

const RESULT_OPTIONS: { value: GameResult | ""; label: string }[] = [
  { value: "", label: "All results" },
  { value: "win", label: "Wins" },
  { value: "draw", label: "Draws" },
  { value: "loss", label: "Losses" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: "", label: "All years" },
  ...Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) => {
    const y = String(CURRENT_YEAR - i);
    return { value: y, label: y };
  }),
];

// Opponent-rating bands. `value` is "<min>-<max>", either side may be blank.
const RATING_OPTIONS = [
  { value: "", label: "All ratings" },
  { value: "-1599", label: "Under 1600" },
  { value: "1600-1799", label: "1600–1799" },
  { value: "1800-1999", label: "1800–1999" },
  { value: "2000-2199", label: "2000–2199" },
  { value: "2200-2399", label: "2200–2399" },
  { value: "2400-", label: "2400+" },
];

function ratingParams(band: string): { min_rating?: string; max_rating?: string } {
  if (!band) return {};
  const [min, max] = band.split("-");
  return { ...(min ? { min_rating: min } : {}), ...(max ? { max_rating: max } : {}) };
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

const selectCls =
  "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-200 dark:focus:border-brand-500";

export function AllGamesView({ slug }: AllGamesViewProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);

  function handleGameDeleted(gameId: number) {
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    setTotal((prev) => prev - 1);
  }
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [colorFilter, setColorFilter] = useState<ColorChoice | "">("");
  const [resultFilter, setResultFilter] = useState<GameResult | "">("");
  const [sourceFilter, setSourceFilter] = useState<GameSource | "">("");
  const [yearFilter, setYearFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [search, setSearch] = useState("");

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [colorFilter, resultFilter, sourceFilter, yearFilter, ratingFilter, search]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getPlayerGames(slug, {
        ...(colorFilter ? { color_played: colorFilter } : {}),
        ...(resultFilter ? { result: resultFilter } : {}),
        ...(sourceFilter ? { source: sourceFilter } : {}),
        ...(yearFilter ? { year: yearFilter } : {}),
        ...ratingParams(ratingFilter),
        ...(search ? { search } : {}),
        page,
      })
      .then((data: PaginatedResponse<Game>) => {
        setGames(data.results);
        setTotal(data.count);
      })
      .catch(() => setError("Failed to load games."))
      .finally(() => setLoading(false));
  }, [slug, colorFilter, resultFilter, sourceFilter, yearFilter, ratingFilter, search, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = Boolean(
    colorFilter || resultFilter || sourceFilter || yearFilter || ratingFilter || search
  );

  return (
    <div>
      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Color pills */}
        <div className="flex items-center gap-1.5">
          {(["", "white", "black"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setColorFilter(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                colorFilter === c
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-elevated dark:text-gray-300 dark:hover:bg-dark-muted"
              }`}
            >
              {c === "" ? "All colors" : c === "white" ? "As White" : "As Black"}
            </button>
          ))}
        </div>

        <span className="h-4 w-px bg-gray-200 dark:bg-dark-border" />

        {/* Result pills */}
        <div className="flex items-center gap-1.5">
          {RESULT_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setResultFilter(r.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                resultFilter === r.value
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-elevated dark:text-gray-300 dark:hover:bg-dark-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <span className="h-4 w-px bg-gray-200 dark:bg-dark-border" />

        {/* Source selector */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as GameSource | "")}
          className={selectCls}
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Year selector */}
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className={selectCls}
        >
          {YEAR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Opponent rating selector */}
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className={selectCls}
          title="Opponent rating"
        >
          {RATING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search opponent, event, opening…"
          className={selectCls + " min-w-[220px]"}
        />

        {!loading && (
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
            {total} game{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

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
