"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  fetchBroadcastDetail,
  fetchRoundPgn,
  fetchTopBroadcasts,
  formatBroadcastDate,
  formatBroadcastRange,
  splitPgn,
  tierLabel,
  type LichessBroadcastEntry,
  type LichessRound,
  type ParsedBroadcastGame,
} from "@/lib/lichess";
import { SearchInput } from "@/components/ui/SearchInput";
import { MasterGameViewerModal } from "@/components/players/MasterGameViewerModal";
import type { MasterGame, TournamentSummary } from "@/types";

// ── Shared result helpers ─────────────────────────────────────────────────────

const RESULT_COLOR: Record<string, string> = {
  "1-0":     "text-emerald-600 dark:text-emerald-400",
  "0-1":     "text-red-500 dark:text-red-400",
  "1/2-1/2": "text-amber-500 dark:text-amber-400",
  "*":       "text-gray-400 dark:text-gray-600",
};
const RESULT_LABEL: Record<string, string> = {
  "1-0": "1-0", "0-1": "0-1", "1/2-1/2": "½-½", "*": "live",
};

// ── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: "twic" | "lichess" }) {
  return source === "twic" ? (
    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:border-sky-800/60 dark:bg-sky-900/20 dark:text-sky-400">
      TWIC
    </span>
  ) : (
    <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: "#b05000", color: "#b05000", background: "rgba(176,80,0,0.07)" }}>
      Lichess
    </span>
  );
}

// ── TWIC tab ──────────────────────────────────────────────────────────────────

function TwicTournamentCard({
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
      <div className="flex items-start justify-between gap-2">
        <p className={`truncate text-sm font-semibold ${selected ? "text-brand-700 dark:text-brand-400" : "text-gray-900 dark:text-gray-100"}`}>
          {t.event}
        </p>
        <SourceBadge source="twic" />
      </div>
      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>{yearLabel}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-elevated dark:text-gray-400">
          {t.game_count} games
        </span>
      </div>
    </button>
  );
}

function TwicGameRow({ game, onClick }: { game: MasterGame; onClick: () => void }) {
  const hasMoves = Boolean(game.moves?.trim());
  return (
    <button
      onClick={onClick}
      disabled={!hasMoves}
      className={`group flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm transition-all dark:border-dark-border dark:bg-dark-surface ${
        hasMoves ? "hover:border-brand-200 hover:bg-brand-50/30 dark:hover:border-brand-800 dark:hover:bg-brand-900/10" : "cursor-default opacity-60"
      }`}
    >
      <span className={`w-7 shrink-0 font-mono text-xs font-bold ${RESULT_COLOR[game.result] ?? "text-gray-500"}`}>
        {RESULT_LABEL[game.result] ?? game.result}
      </span>
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
      {game.year && <span className="shrink-0 text-xs text-gray-400">{game.year}</span>}
      {hasMoves && (
        <svg className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-brand-500 transition-colors dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </button>
  );
}

// ── Lichess tab ───────────────────────────────────────────────────────────────

function BroadcastCard({
  entry,
  selected,
  onClick,
}: {
  entry: LichessBroadcastEntry;
  selected: boolean;
  onClick: () => void;
}) {
  const { tour, round } = entry;
  const tier = tierLabel(tour.tier);
  const dateRange = formatBroadcastRange(tour.dates);
  const isLive = round.ongoing;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
        selected
          ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20"
          : "border-gray-200 bg-white hover:border-brand-200 hover:bg-gray-50 dark:border-dark-border dark:bg-dark-surface dark:hover:border-brand-800 dark:hover:bg-dark-elevated"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`truncate text-sm font-semibold ${selected ? "text-brand-700 dark:text-brand-400" : "text-gray-900 dark:text-gray-100"}`}>
          {tour.name}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {isLive && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              LIVE
            </span>
          )}
          <SourceBadge source="lichess" />
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        {dateRange && <span>{dateRange}</span>}
        {tier && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            {tier}
          </span>
        )}
        {tour.info?.format && <span className="truncate">{tour.info.format}</span>}
      </div>
    </button>
  );
}

function RoundRow({
  round,
  selected,
  onClick,
}: {
  round: LichessRound;
  selected: boolean;
  onClick: () => void;
}) {
  const date = round.startsAt ? formatBroadcastDate(round.startsAt) : "";
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
        selected
          ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-dark-border dark:bg-dark-surface dark:text-gray-300 dark:hover:bg-dark-elevated"
      }`}
    >
      <span className="font-medium">{round.name}</span>
      <div className="flex items-center gap-2">
        {round.ongoing && (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Live
          </span>
        )}
        {date && <span className="text-xs text-gray-400">{date}</span>}
      </div>
    </button>
  );
}

function BroadcastGameRow({ game, onClick }: { game: ParsedBroadcastGame; onClick: () => void }) {
  const hasMoves = Boolean(game.moves?.trim()) && game.result !== "*";
  const isLive = game.result === "*";
  return (
    <button
      onClick={onClick}
      disabled={!hasMoves}
      className={`group flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm transition-all dark:border-dark-border dark:bg-dark-surface ${
        hasMoves ? "hover:border-brand-200 hover:bg-brand-50/30 dark:hover:border-brand-800 dark:hover:bg-brand-900/10" : "cursor-default opacity-70"
      }`}
    >
      <span className={`w-9 shrink-0 font-mono text-xs font-bold ${RESULT_COLOR[game.result] ?? "text-gray-400"}`}>
        {isLive ? (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          </span>
        ) : (RESULT_LABEL[game.result] ?? game.result)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900 dark:text-gray-100">
          {game.white}
          {game.whiteElo ? <span className="ml-1 text-xs font-normal text-gray-400">({game.whiteElo})</span> : null}
          <span className="mx-2 text-gray-300 dark:text-gray-600">vs</span>
          {game.black}
          {game.blackElo ? <span className="ml-1 text-xs font-normal text-gray-400">({game.blackElo})</span> : null}
        </p>
        {game.openingName && (
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {game.eco}{game.openingName ? ` · ${game.openingName}` : ""}
          </p>
        )}
      </div>
      {hasMoves && (
        <svg className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-brand-500 transition-colors dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function SelectPrompt({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-dark-border">
      <div className="text-center">
        <svg className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <p className="text-sm text-gray-400 dark:text-gray-600">{label}</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "twic" | "lichess";

export default function MasterGamesPage() {
  const [tab, setTab] = useState<Tab>("lichess");

  // ── TWIC state ──────────────────────────────────────────────────────────────
  const [search, setSearch]           = useState("");
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [tourLoading, setTourLoading] = useState(true);
  const [selectedTwic, setSelectedTwic]   = useState<TournamentSummary | null>(null);
  const [twicGames, setTwicGames]         = useState<MasterGame[]>([]);
  const [twicGamesLoading, setTwicGamesLoading] = useState(false);

  // ── Lichess state ───────────────────────────────────────────────────────────
  const [broadcasts, setBroadcasts]     = useState<LichessBroadcastEntry[]>([]);
  const [bcastLoading, setBcastLoading] = useState(true);
  const [selectedBcast, setSelectedBcast] = useState<LichessBroadcastEntry | null>(null);
  const [rounds, setRounds]             = useState<LichessRound[]>([]);
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState<LichessRound | null>(null);
  const [roundGames, setRoundGames]     = useState<ParsedBroadcastGame[]>([]);
  const [roundLoading, setRoundLoading] = useState(false);

  // ── Shared viewer ───────────────────────────────────────────────────────────
  const [viewingGame, setViewingGame] = useState<MasterGame | null>(null);

  // ── TWIC effects ────────────────────────────────────────────────────────────
  useEffect(() => {
    setTourLoading(true);
    api.getTournamentList(search || undefined, 80)
      .then(setTournaments).catch(() => setTournaments([]))
      .finally(() => setTourLoading(false));
  }, [search]);

  useEffect(() => {
    if (!selectedTwic) { setTwicGames([]); return; }
    setTwicGamesLoading(true);
    api.getMasterGames({ event: selectedTwic.event, limit: 100 })
      .then(setTwicGames).catch(() => setTwicGames([]))
      .finally(() => setTwicGamesLoading(false));
  }, [selectedTwic]);

  // ── Lichess effects ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "lichess") return;
    setBcastLoading(true);
    fetchTopBroadcasts(40)
      .then(setBroadcasts).catch(() => setBroadcasts([]))
      .finally(() => setBcastLoading(false));
  }, [tab]);

  useEffect(() => {
    if (!selectedBcast) { setRounds([]); setSelectedRound(null); return; }
    setRoundsLoading(true);
    fetchBroadcastDetail(selectedBcast.tour.id)
      .then((d) => setRounds(d.rounds)).catch(() => setRounds([]))
      .finally(() => setRoundsLoading(false));
  }, [selectedBcast]);

  useEffect(() => {
    if (!selectedRound) { setRoundGames([]); return; }
    setRoundLoading(true);
    fetchRoundPgn(selectedRound.url)
      .then((pgn) => setRoundGames(splitPgn(pgn)))
      .catch(() => setRoundGames([]))
      .finally(() => setRoundLoading(false));
  }, [selectedRound]);

  const handleSearch = useCallback((q: string) => { setSearch(q); setSelectedTwic(null); }, []);

  // Convert a ParsedBroadcastGame → MasterGame for the viewer modal
  function toViewable(g: ParsedBroadcastGame): MasterGame {
    return {
      id: 0,
      white: g.white,
      black: g.black,
      white_elo: g.whiteElo,
      black_elo: g.blackElo,
      result: (["1-0","0-1","1/2-1/2"].includes(g.result) ? g.result : "1/2-1/2") as MasterGame["result"],
      eco: g.eco,
      opening_name: g.openingName,
      event: g.event,
      site: "",
      year: g.date ? parseInt(g.date.slice(0, 4)) || null : null,
      moves: g.moves,
    };
  }

  const totalGames = tournaments.reduce((s, t) => s + t.game_count, 0);

  return (
    <>
      {viewingGame && (
        <MasterGameViewerModal game={viewingGame} onClose={() => setViewingGame(null)} />
      )}

      <div>
        {/* Header */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">GM Library</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">Tournaments</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Browse major chess tournaments and play through GM games
          </p>
        </div>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit dark:border-dark-border dark:bg-dark-elevated">
          {([
            { id: "lichess" as Tab, label: "Live · Lichess", dot: <span className="h-1.5 w-1.5 rounded-full bg-[#b05000]" /> },
            { id: "twic"    as Tab, label: `Archived · TWIC`, dot: <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> },
          ]).map(({ id, label, dot }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tab === id
                  ? "bg-white shadow text-gray-900 dark:bg-dark-surface dark:text-gray-100 dark:shadow-black/40"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {dot}
              {label}
            </button>
          ))}
        </div>

        {/* ── TWIC tab ─────────────────────────────────────────────────────── */}
        {tab === "twic" && (
          <>
            <div className="mb-6">
              <SearchInput
                placeholder="Search tournaments — Tata Steel, Candidates, Bundesliga…"
                onSearch={handleSearch}
                defaultValue={search}
                className="max-w-xl"
              />
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-600">
                {totalGames.toLocaleString()} GM classical games across {tournaments.length} tournaments · imported from TWIC 2024–2026
              </p>
            </div>

            <div className="flex gap-6 lg:items-start">
              {/* Tournament list */}
              <div className="w-full shrink-0 space-y-2 lg:w-80 xl:w-96">
                {tourLoading
                  ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-dark-elevated" />)
                  : tournaments.length === 0
                    ? <p className="py-8 text-center text-sm text-gray-400">No tournaments found.</p>
                    : tournaments.map((t) => (
                        <TwicTournamentCard key={t.event} t={t} selected={selectedTwic?.event === t.event} onClick={() => setSelectedTwic(t)} />
                      ))
                }
              </div>

              {/* Games */}
              <div className="min-w-0 flex-1">
                {!selectedTwic ? (
                  <SelectPrompt label="Select a tournament to view its games" />
                ) : (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedTwic.event}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedTwic.year_min === selectedTwic.year_max ? selectedTwic.year_max : `${selectedTwic.year_min}–${selectedTwic.year_max}`}
                          {" · "}{selectedTwic.game_count} games
                        </p>
                      </div>
                      <button onClick={() => setSelectedTwic(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-elevated">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    {twicGamesLoading
                      ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-dark-elevated" />)}</div>
                      : twicGames.length === 0
                        ? <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center dark:border-dark-border"><p className="text-sm text-gray-400">No games found.</p></div>
                        : <div className="space-y-2">
                            {twicGames.map((g) => (
                              <TwicGameRow key={g.id} game={g} onClick={() => g.moves?.trim() && setViewingGame(g)} />
                            ))}
                            {twicGames.length >= 100 && <p className="pt-2 text-center text-xs text-gray-400">Showing top 100 games by rating.</p>}
                          </div>
                    }
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Lichess tab ──────────────────────────────────────────────────── */}
        {tab === "lichess" && (
          <div className="flex gap-6 lg:items-start">
            {/* Broadcast list */}
            <div className="w-full shrink-0 space-y-2 lg:w-80 xl:w-96">
              <p className="mb-3 text-xs text-gray-400 dark:text-gray-600">
                Live and recent major broadcasts from Lichess
              </p>
              {bcastLoading
                ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-dark-elevated" />)
                : broadcasts.map((entry) => (
                    <BroadcastCard
                      key={entry.tour.id}
                      entry={entry}
                      selected={selectedBcast?.tour.id === entry.tour.id}
                      onClick={() => { setSelectedBcast(entry); setSelectedRound(null); }}
                    />
                  ))
              }
            </div>

            {/* Right panel: rounds + games */}
            <div className="min-w-0 flex-1">
              {!selectedBcast ? (
                <SelectPrompt label="Select a tournament to view its rounds" />
              ) : (
                <div className="space-y-4">
                  {/* Tournament header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedBcast.tour.name}</h2>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        {formatBroadcastRange(selectedBcast.tour.dates) && <span>{formatBroadcastRange(selectedBcast.tour.dates)}</span>}
                        {selectedBcast.tour.info?.location && <span>· {selectedBcast.tour.info.location}</span>}
                        {selectedBcast.tour.info?.format && <span>· {selectedBcast.tour.info.format}</span>}
                      </div>
                    </div>
                    <button onClick={() => { setSelectedBcast(null); setSelectedRound(null); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-elevated">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  {/* Rounds */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-600">Rounds</p>
                    {roundsLoading
                      ? <div className="space-y-1.5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-dark-elevated" />)}</div>
                      : <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                          {rounds.map((r) => (
                            <RoundRow key={r.id} round={r} selected={selectedRound?.id === r.id} onClick={() => setSelectedRound(r)} />
                          ))}
                        </div>
                    }
                  </div>

                  {/* Games for selected round */}
                  {selectedRound && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-600">
                        Games · {selectedRound.name}
                      </p>
                      {roundLoading
                        ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-dark-elevated" />)}</div>
                        : roundGames.length === 0
                          ? <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center dark:border-dark-border"><p className="text-sm text-gray-400">No games available for this round yet.</p></div>
                          : <div className="space-y-2">
                              {roundGames.map((g, i) => (
                                <BroadcastGameRow
                                  key={i}
                                  game={g}
                                  onClick={() => {
                                    if (g.moves?.trim() && g.result !== "*") setViewingGame(toViewable(g));
                                  }}
                                />
                              ))}
                            </div>
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
