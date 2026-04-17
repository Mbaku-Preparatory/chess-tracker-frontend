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

const PAGE_SIZE = 20;

const selectCls =
  "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

export function AllGamesView({ slug }: AllGamesViewProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [colorFilter, setColorFilter] = useState<ColorChoice | "">("");
  const [resultFilter, setResultFilter] = useState<GameResult | "">("");
  const [sourceFilter, setSourceFilter] = useState<GameSource | "">("");
  const [yearFilter, setYearFilter] = useState("");
  const [search, setSearch] = useState("");

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [colorFilter, resultFilter, sourceFilter, yearFilter, search]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getPlayerGames(slug, {
        ...(colorFilter ? { color_played: colorFilter } : {}),
        ...(resultFilter ? { result: resultFilter } : {}),
        ...(sourceFilter ? { source: sourceFilter } : {}),
        ...(yearFilter ? { year: yearFilter } : {}),
        ...(search ? { search } : {}),
        page,
      })
      .then((data: PaginatedResponse<Game>) => {
        setGames(data.results);
        setTotal(data.count);
      })
      .catch(() => setError("Failed to load games."))
      .finally(() => setLoading(false));
  }, [slug, colorFilter, resultFilter, sourceFilter, yearFilter, search, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = Boolean(colorFilter || resultFilter || sourceFilter || yearFilter || search);

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
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c === "" ? "All colors" : c === "white" ? "As White" : "As Black"}
            </button>
          ))}
        </div>

        <span className="h-4 w-px bg-gray-200" />

        {/* Result pills */}
        <div className="flex items-center gap-1.5">
          {RESULT_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setResultFilter(r.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                resultFilter === r.value
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <span className="h-4 w-px bg-gray-200" />

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

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search opponent, event, opening…"
          className={selectCls + " min-w-[220px]"}
        />

        {!loading && (
          <span className="ml-auto text-xs text-gray-400">
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
            <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : games.length > 0 ? (
        <>
          <GamesTable games={games} />

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">
            {hasActiveFilters
              ? "No games match the current filters."
              : "No games found."}
          </p>
        </div>
      )}
    </div>
  );
}
