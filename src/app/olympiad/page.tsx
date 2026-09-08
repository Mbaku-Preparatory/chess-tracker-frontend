"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { SearchInput } from "@/components/ui/SearchInput";
import type { OlympiadFilters, OlympiadGame } from "@/types";

/**
 * The Chess Olympiad archive.
 *
 * Filtered by country and round, because that is how a team event is read —
 * "how did Kenya do in round 3", not "show me the Najdorf". Openings have
 * their own explorer and this does not duplicate it.
 *
 * Filter values come from the server, so the country row only offers
 * federations that actually played. Two hundred codes where most return
 * nothing is worse than no list at all.
 */

const RESULT_LABEL: Record<string, string> = {
  "1-0": "1–0",
  "0-1": "0–1",
  "1/2-1/2": "½–½",
};

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${
        selected
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-gray-300 bg-white text-gray-600 hover:border-brand-400 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-300"
      }`}
    >
      {label}
    </button>
  );
}

function FilterRow({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  if (values.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </p>
      {/* Scrolls inside itself: a century of federations must never make the
          page scroll sideways. */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {/* "All" is a chip rather than a clear button, so clearing one filter
            never reads as clearing every filter. */}
        <Chip label="All" selected={selected === null} onClick={() => onSelect(null)} />
        {values.map((v) => (
          <Chip key={v} label={v} selected={selected === v} onClick={() => onSelect(v)} />
        ))}
      </div>
    </div>
  );
}

// A dash, never a guess: TWIC-sourced rows genuinely carry no federation.
const fed = (code: string) => code || "—";

export default function OlympiadPage() {
  const [filters, setFilters] = useState<OlympiadFilters | null>(null);
  const [games, setGames] = useState<OlympiadGame[]>([]);
  const [count, setCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState<number | null>(null);
  const [federation, setFederation] = useState<string | null>(null);
  const [round, setRound] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .getOlympiadFilters()
      .then(setFilters)
      .catch((err) => setError(userMessage(err, "Couldn't load the Olympiad archive.")));
  }, []);

  const load = useCallback(
    async (nextPage: number) => {
      if (nextPage === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const body = await api.getOlympiadGames({ year, federation, round, search, page: nextPage });
        setGames((prev) => (nextPage === 1 ? body.results : [...prev, ...body.results]));
        setCount(body.count);
        setHasMore(body.has_more);
        setPage(body.page);
      } catch (err) {
        setError(userMessage(err, "Couldn't load those games."));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [year, federation, round, search]
  );

  // Any filter change resets to page one. Carrying the page number across a
  // change lands the reader on page 4 of a three-page result, which looks
  // exactly like a filter that matched nothing.
  useEffect(() => {
    load(1);
  }, [load]);

  const years = Array.from(new Set((filters?.events ?? []).map((e) => String(e.year))));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Olympiad</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {filters
            ? `${filters.total_games.toLocaleString()} games from ${filters.events.length} events`
            : "Chess Olympiad archive"}
        </p>
      </div>

      <SearchInput placeholder="Search a player…" onSearch={setSearch} className="mb-4" />

      <FilterRow
        label="Country"
        values={filters?.federations ?? []}
        selected={federation}
        onSelect={setFederation}
      />
      <FilterRow label="Round" values={filters?.rounds ?? []} selected={round} onSelect={setRound} />
      <FilterRow
        label="Year"
        values={years}
        selected={year === null ? null : String(year)}
        onSelect={(v) => setYear(v === null ? null : Number(v))}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
      ) : games.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center dark:border-dark-border">
          <p className="font-semibold text-gray-900 dark:text-gray-100">No games match</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try a different country or round.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
            {count.toLocaleString()} game{count === 1 ? "" : "s"}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-400 dark:border-dark-border">
                  <th className="py-2 pr-3 font-semibold">White</th>
                  <th className="py-2 pr-3 font-semibold">Black</th>
                  <th className="py-2 pr-3 font-semibold">Result</th>
                  <th className="py-2 pr-3 font-semibold">Year</th>
                  <th className="py-2 pr-3 font-semibold">Round</th>
                  <th className="py-2 font-semibold">Opening</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-gray-100 last:border-0 dark:border-dark-border/60"
                  >
                    <td className="py-2 pr-3 text-gray-900 dark:text-gray-100">
                      {g.white}{" "}
                      <span className="text-gray-400">({fed(g.white_federation)})</span>
                    </td>
                    <td className="py-2 pr-3 text-gray-900 dark:text-gray-100">
                      {g.black}{" "}
                      <span className="text-gray-400">({fed(g.black_federation)})</span>
                    </td>
                    <td className="py-2 pr-3 font-semibold text-gray-600 dark:text-gray-300">
                      {RESULT_LABEL[g.result] ?? g.result}
                    </td>
                    <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">{g.year ?? "—"}</td>
                    <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">{g.round || "—"}</td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">
                      {[g.eco, g.opening_name].filter(Boolean).join(" ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => load(page + 1)}
                disabled={loadingMore}
                className="btn-secondary"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
