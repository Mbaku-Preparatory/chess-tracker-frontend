"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { ViewButton } from "@/components/ui/ViewButton";
import { federationFor, federationsFor } from "@/lib/federations";
import { SearchInput } from "@/components/ui/SearchInput";
import { MasterGameViewerModal } from "@/components/players/MasterGameViewerModal";
import type { MasterGame, OlympiadFilters, OlympiadGame } from "@/types";

/**
 * The Chess Olympiad archive.
 *
 * Filtered by country and round, which is how a team event is read — "how did
 * Kenya do in round 3". The openings explorer already answers the other
 * question and this does not duplicate it.
 *
 * Country and round are dropdowns because their ranges are known and long: 209
 * federations and 21 rounds are a scrolling row of chips nobody can use. Year
 * is typed because its range is a century and a reader almost always has a
 * specific one in mind — scanning 90 options to find 1978 is slower than
 * typing it.
 */

const RESULT_LABEL: Record<string, string> = {
  "1-0": "1–0",
  "0-1": "0–1",
  "1/2-1/2": "½–½",
};

const SELECT_CLASS =
  "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 " +
  "focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 " +
  "dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100";

/**
 * The flag alone, with the country's name on hover.
 *
 * The code alongside it was noise — a flag already says which country, and
 * repeating it in three letters made every row read twice. The code survives
 * only as the fallback for federations emoji has no flag for: nations that no
 * longer exist, and FIDE's own non-national associations.
 *
 * A dash, never a guess, where the source recorded no federation at all.
 */
function Federation({ code }: { code: string }) {
  if (!code) return <span className="text-gray-400">—</span>;
  const f = federationFor(code);
  return (
    <span className="text-gray-400" title={f.name}>
      {f.flag || f.code}
    </span>
  );
}

export default function OlympiadPage() {
  const [filters, setFilters] = useState<OlympiadFilters | null>(null);
  const [games, setGames] = useState<OlympiadGame[]>([]);
  const [count, setCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [section, setSection] = useState("");
  const [federation, setFederation] = useState("");
  const [round, setRound] = useState("");
  const [year, setYear] = useState("");
  const [search, setSearch] = useState("");

  // Guards against two loads racing. This must be a ref, not the loadingMore
  // state: React batches state updates, so two onEndReached calls in the same
  // tick both read `false`, both request the same page, and the same fifty
  // games are appended twice — which is what produced duplicate list keys.
  const inFlight = useRef(false);

  const [openGame, setOpenGame] = useState<MasterGame | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

  useEffect(() => {
    api
      .getOlympiadFilters()
      .then(setFilters)
      .catch((err) => setError(userMessage(err, "Couldn't load the Olympiad archive.")));
  }, []);

  const load = useCallback(
    async (nextPage: number) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (nextPage === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const body = await api.getOlympiadGames({
          section: section || null,
          year: year && /^\d{4}$/.test(year) ? Number(year) : null,
          federation: federation || null,
          round: round || null,
          search: search || null,
          page: nextPage,
        });
        setGames((prev) => {
          if (nextPage === 1) return body.results;
          // Belt and braces. The ref above should make a repeat impossible,
          // but a duplicate id here means React silently omits rows rather
          // than merely warning, so it is worth being certain.
          const seen = new Set(prev.map((g) => g.id));
          return [...prev, ...body.results.filter((g) => !seen.has(g.id))];
        });
        setCount(body.count);
        setHasMore(body.has_more);
        setPage(body.page);
      } catch (err) {
        setError(userMessage(err, "Couldn't load those games."));
      } finally {
        inFlight.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [section, year, federation, round, search]
  );

  // Any filter change resets to page one. Carrying the page number lands the
  // reader on page 4 of a three-page result, which looks like a filter that
  // matched nothing.
  useEffect(() => {
    load(1);
  }, [load]);

  // Built from the events that exist. Olympiads are not annual — they are
  // biennial, and wars and boycotts leave further gaps — so a typed year is
  // mostly a guess at which ones actually happened.
  const years = useMemo(() => {
    const set = Array.from(new Set((filters?.events ?? []).map((e) => e.year)));
    set.sort((a, b) => b - a);
    return set.map(String);
  }, [filters]);

  const federationOptions = useMemo(
    () => federationsFor(filters?.federations ?? []),
    [filters]
  );

  async function openGameViewer(game: OlympiadGame) {
    setOpeningId(game.id);
    try {
      const full = await api.getOlympiadGameMoves(game.id);
      setOpenGame({ ...full, result: full.result as MasterGame["result"] });
    } catch (err) {
      setError(userMessage(err, "Couldn't open that game."));
    } finally {
      setOpeningId(null);
    }
  }

  const activeFilters = [section, federation, round, year, search].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Olympiad</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {filters
            ? `${filters.total_games.toLocaleString()} games from ${filters.events.length} events, 1924–2024`
            : "Chess Olympiad archive"}
        </p>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-dark-border dark:bg-dark-elevated">
        {[
          { value: "", label: "All" },
          ...(filters?.sections ?? []).map((s) => ({
            value: s.value,
            label: `${s.label} (${s.games.toLocaleString()})`,
          })),
        ].map((opt) => (
          <button
            key={opt.value || "all"}
            type="button"
            onClick={() => setSection(opt.value)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              section === opt.value
                ? "bg-white text-brand-700 shadow-sm dark:bg-dark-surface dark:text-brand-400"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Country
          </span>
          <select
            value={federation}
            onChange={(e) => setFederation(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">All countries</option>
            {federationOptions.map((f) => (
              <option key={f.code} value={f.code}>
                {f.flag} {f.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Round
          </span>
          <select
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">All rounds</option>
            {(filters?.rounds ?? []).map((r) => (
              <option key={r} value={String(r)}>
                Round {r}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Year
          </span>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={SELECT_CLASS}>
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <div className="min-w-[200px] flex-1">
          <SearchInput placeholder="Search a player…" onSearch={setSearch} />
        </div>

        {activeFilters > 0 && (
          <button
            type="button"
            onClick={() => {
              setSection("");
              setFederation("");
              setRound("");
              setYear("");
              setSearch("");
            }}
            className="pb-2 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Clear
          </button>
        )}
      </div>

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
            Try a different country, round or year.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
            {count.toLocaleString()} game{count === 1 ? "" : "s"}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-400 dark:border-dark-border">
                  <th className="py-2 pr-3 font-semibold">White</th>
                  <th className="py-2 pr-3 font-semibold">Black</th>
                  <th className="py-2 pr-3 font-semibold">Result</th>
                  <th className="py-2 pr-3 font-semibold">Year</th>
                  <th className="py-2 pr-3 font-semibold">Round</th>
                  <th className="py-2 font-semibold">Opening</th>
                  {/* Header-less: the buttons under it say what they are. */}
                  <th className="w-px py-2" />
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr
                    key={g.id}
                    onClick={() => openGameViewer(g)}
                    className="cursor-pointer border-b border-gray-100 transition-colors last:border-0 hover:bg-brand-50 dark:border-dark-border/60 dark:hover:bg-brand-900/20"
                  >
                    <td className="py-2 pr-3 text-gray-900 dark:text-gray-100">
                      {g.white} <Federation code={g.white_federation} />
                    </td>
                    <td className="py-2 pr-3 text-gray-900 dark:text-gray-100">
                      {g.black} <Federation code={g.black_federation} />
                    </td>
                    <td className="py-2 pr-3 font-semibold text-gray-600 dark:text-gray-300">
                      {/* The result stays put while the game loads; the View
                          button carries that now, and blanking the result was
                          only ever a stand-in for having somewhere to show it. */}
                      {RESULT_LABEL[g.result] ?? g.result}
                    </td>
                    <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">{g.year ?? "—"}</td>
                    <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">
                      {g.round_number ?? "—"}
                    </td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">
                      {[g.eco, g.opening_name].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="py-2 pl-3 text-right">
                      <ViewButton
                        onClick={() => openGameViewer(g)}
                        loading={openingId === g.id}
                        label={`View ${g.white} versus ${g.black}`}
                      />
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

      {openGame && (
        <MasterGameViewerModal game={openGame} onClose={() => setOpenGame(null)} />
      )}
    </div>
  );
}
