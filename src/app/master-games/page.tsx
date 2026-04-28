"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { SearchInput } from "@/components/ui/SearchInput";
import { MasterGameViewerModal } from "@/components/players/MasterGameViewerModal";
import type { TournamentSummary, MasterGame } from "@/types";

// ── Result icon ───────────────────────────────────────────────────────────────

const RESULT_COLOR: Record<string, string> = {
  "1-0":     "text-emerald-600 dark:text-emerald-400",
  "0-1":     "text-red-500    dark:text-red-400",
  "1/2-1/2": "text-amber-500  dark:text-amber-400",
};
const RESULT_LABEL: Record<string, string> = {
  "1-0": "1-0", "0-1": "0-1", "1/2-1/2": "½-½",
};

// ── Tournament card ───────────────────────────────────────────────────────────

function TournamentCard({
  t,
  selected,
  onClick,
}: {
  t: TournamentSummary;
  selected: boolean;
  onClick: () => void;
}) {
  const yearLabel = t.year_min === t.year_max
    ? String(t.year_max ?? "")
    : `${t.year_min ?? ""}–${t.year_max ?? ""}`;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
        selected
          ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20"
          : "border-gray-200 bg-white hover:border-brand-200 hover:bg-gray-50 dark:border-dark-border dark:bg-dark-surface dark:hover:border-brand-800 dark:hover:bg-dark-elevated"
      }`}
    >
      <p className={`truncate text-sm font-semibold ${selected ? "text-brand-700 dark:text-brand-400" : "text-gray-900 dark:text-gray-100"}`}>
        {t.event}
      </p>
      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>{yearLabel}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-elevated dark:text-gray-400">
          {t.game_count} games
        </span>
      </div>
    </button>
  );
}

// ── Game row ──────────────────────────────────────────────────────────────────

function GameRow({ game, onClick }: { game: MasterGame; onClick: () => void }) {
  const resultCls   = RESULT_COLOR[game.result] ?? "text-gray-500";
  const resultLabel = RESULT_LABEL[game.result] ?? game.result;
  const hasMoves    = Boolean(game.moves?.trim());

  return (
    <button
      onClick={onClick}
      disabled={!hasMoves}
      className={`group flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm transition-all dark:border-dark-border dark:bg-dark-surface ${
        hasMoves
          ? "hover:border-brand-200 hover:bg-brand-50/30 dark:hover:border-brand-800 dark:hover:bg-brand-900/10"
          : "cursor-default opacity-60"
      }`}
    >
      {/* Result */}
      <span className={`w-7 shrink-0 font-mono text-xs font-bold ${resultCls}`}>
        {resultLabel}
      </span>

      {/* Players */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900 dark:text-gray-100">
          {game.white}
          {game.white_elo ? <span className="ml-1 text-xs font-normal text-gray-400">({game.white_elo})</span> : null}
          <span className="mx-2 text-gray-300 dark:text-gray-600">vs</span>
          {game.black}
          {game.black_elo ? <span className="ml-1 text-xs font-normal text-gray-400">({game.black_elo})</span> : null}
        </p>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          {game.eco}{game.opening_name ? ` · ${game.opening_name}` : ""}
        </p>
      </div>

      {/* Year */}
      {game.year && <span className="shrink-0 text-xs text-gray-400">{game.year}</span>}

      {/* Play indicator */}
      {hasMoves && (
        <svg className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-brand-500 transition-colors dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MasterGamesPage() {
  const [search, setSearch]               = useState("");
  const [tournaments, setTournaments]     = useState<TournamentSummary[]>([]);
  const [tourLoading, setTourLoading]     = useState(true);
  const [selected, setSelected]           = useState<TournamentSummary | null>(null);
  const [games, setGames]                 = useState<MasterGame[]>([]);
  const [gamesLoading, setGamesLoading]   = useState(false);
  const [viewingGame, setViewingGame]     = useState<MasterGame | null>(null);

  // Load tournament list
  useEffect(() => {
    setTourLoading(true);
    api.getTournamentList(search || undefined, 80)
      .then(setTournaments)
      .catch(() => setTournaments([]))
      .finally(() => setTourLoading(false));
  }, [search]);

  // Load games when tournament selected
  useEffect(() => {
    if (!selected) { setGames([]); return; }
    setGamesLoading(true);
    api.getMasterGames({ event: selected.event, limit: 100 })
      .then(setGames)
      .catch(() => setGames([]))
      .finally(() => setGamesLoading(false));
  }, [selected]);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setSelected(null);
  }, []);

  const totalGames = tournaments.reduce((s, t) => s + t.game_count, 0);

  return (
    <>
      {viewingGame && (
        <MasterGameViewerModal game={viewingGame} onClose={() => setViewingGame(null)} />
      )}

      <div>
        {/* Page header */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            GM Library
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Tournaments
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {totalGames.toLocaleString()} GM classical games across {tournaments.length} tournaments
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <SearchInput
            placeholder="Search tournaments — Tata Steel, Candidates, Sinquefield…"
            onSearch={handleSearch}
            defaultValue={search}
            className="max-w-xl"
          />
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6 lg:items-start">
          {/* Left — tournament list */}
          <div className="w-full shrink-0 space-y-2 lg:w-80 xl:w-96">
            {tourLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-dark-elevated" />
              ))
            ) : tournaments.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-600">
                No tournaments found.
              </p>
            ) : (
              tournaments.map((t) => (
                <TournamentCard
                  key={t.event}
                  t={t}
                  selected={selected?.event === t.event}
                  onClick={() => setSelected(t)}
                />
              ))
            )}
          </div>

          {/* Right — games panel */}
          <div className="min-w-0 flex-1">
            {!selected ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-dark-border">
                <div className="text-center">
                  <svg className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                  <p className="text-sm text-gray-400 dark:text-gray-600">Select a tournament to view its games</p>
                </div>
              </div>
            ) : (
              <div>
                {/* Panel header */}
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {selected.event}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selected.year_min === selected.year_max
                        ? selected.year_max
                        : `${selected.year_min}–${selected.year_max}`}
                      {" · "}{selected.game_count} games
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-elevated dark:hover:text-gray-300"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {gamesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-dark-elevated" />
                    ))}
                  </div>
                ) : games.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center dark:border-dark-border">
                    <p className="text-sm text-gray-400 dark:text-gray-600">No games found for this tournament.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {games.map((g) => (
                      <GameRow key={g.id} game={g} onClick={() => g.moves?.trim() && setViewingGame(g)} />
                    ))}
                    {games.length >= 100 && (
                      <p className="pt-2 text-center text-xs text-gray-400 dark:text-gray-600">
                        Showing top 100 games by rating. Import more issues via the management command to see all.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
