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

// ── Helpers ───────────────────────────────────────────────────────────────────

const RESULT_COLOR: Record<string, string> = {
  "1-0":     "text-emerald-600 dark:text-emerald-400",
  "0-1":     "text-red-500 dark:text-red-400",
  "1/2-1/2": "text-amber-500 dark:text-amber-400",
  "*":       "text-gray-400 dark:text-gray-600",
};
const RESULT_LABEL: Record<string, string> = {
  "1-0": "1-0", "0-1": "0-1", "1/2-1/2": "½-½", "*": "·",
};

// ── Reusable bits ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: "twic" | "lichess" }) {
  return source === "twic" ? (
    <span className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:border-sky-800/60 dark:bg-sky-900/20 dark:text-sky-400">
      TWIC
    </span>
  ) : (
    <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: "#b05000", color: "#b05000", background: "rgba(176,80,0,0.07)" }}>
      Lichess
    </span>
  );
}

function BackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="mb-4 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 lg:hidden"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}

function PanelHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold text-gray-900 dark:text-gray-100 sm:text-lg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{subtitle}</p>}
      </div>
      <button onClick={onClose} className="hidden shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-elevated lg:block">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function Skeleton({ rows = 5, h = "h-14" }: { rows?: number; h?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${h} animate-pulse rounded-xl bg-gray-100 dark:bg-dark-elevated`} />
      ))}
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-dark-border sm:h-64">
      <p className="px-4 text-center text-sm text-gray-400 dark:text-gray-600">{label}</p>
    </div>
  );
}

// ── TWIC components ───────────────────────────────────────────────────────────

function TwicTournamentCard({ t, selected, onClick }: { t: TournamentSummary; selected: boolean; onClick: () => void }) {
  const yearLabel = t.year_min === t.year_max ? String(t.year_max ?? "") : `${t.year_min}–${t.year_max}`;
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
      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{yearLabel}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-elevated dark:text-gray-400">
          {t.game_count}g
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
      className={`group flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left transition-all dark:border-dark-border dark:bg-dark-surface sm:gap-3 sm:px-4 ${
        hasMoves ? "hover:border-brand-200 hover:bg-brand-50/30 dark:hover:border-brand-800 dark:hover:bg-brand-900/10" : "cursor-default opacity-60"
      }`}
    >
      <span className={`w-6 shrink-0 font-mono text-xs font-bold sm:w-7 ${RESULT_COLOR[game.result] ?? "text-gray-500"}`}>
        {RESULT_LABEL[game.result] ?? game.result}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-900 dark:text-gray-100 sm:text-sm">
          {game.white}
          <span className="hidden sm:inline">{game.white_elo ? ` (${game.white_elo})` : ""}</span>
          <span className="mx-1.5 text-gray-300 dark:text-gray-600">vs</span>
          {game.black}
          <span className="hidden sm:inline">{game.black_elo ? ` (${game.black_elo})` : ""}</span>
        </p>
        {game.opening_name && (
          <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-500">
            {game.eco}{game.opening_name ? ` · ${game.opening_name}` : ""}
          </p>
        )}
      </div>
      {game.year && <span className="hidden shrink-0 text-xs text-gray-400 sm:block">{game.year}</span>}
      {hasMoves && (
        <svg className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-brand-500 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </button>
  );
}

// ── Lichess components ────────────────────────────────────────────────────────

function BroadcastCard({ entry, selected, onClick }: { entry: LichessBroadcastEntry; selected: boolean; onClick: () => void }) {
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
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        {dateRange && <span>{dateRange}</span>}
        {tier && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            {tier}
          </span>
        )}
      </div>
    </button>
  );
}

function RoundRow({ round, selected, onClick }: { round: LichessRound; selected: boolean; onClick: () => void }) {
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
        {round.startsAt && !round.ongoing && (
          <span className="text-xs text-gray-400">{formatBroadcastDate(round.startsAt)}</span>
        )}
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
      className={`group flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left transition-all dark:border-dark-border dark:bg-dark-surface sm:gap-3 sm:px-4 ${
        hasMoves ? "hover:border-brand-200 hover:bg-brand-50/30 dark:hover:border-brand-800 dark:hover:bg-brand-900/10" : "cursor-default opacity-70"
      }`}
    >
      <span className={`w-6 shrink-0 sm:w-9 ${RESULT_COLOR[game.result] ?? "text-gray-400"}`}>
        {isLive ? <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> : (
          <span className="font-mono text-xs font-bold">{RESULT_LABEL[game.result] ?? game.result}</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-900 dark:text-gray-100 sm:text-sm">
          {game.white}
          <span className="hidden sm:inline">{game.whiteElo ? ` (${game.whiteElo})` : ""}</span>
          <span className="mx-1.5 text-gray-300 dark:text-gray-600">vs</span>
          {game.black}
          <span className="hidden sm:inline">{game.blackElo ? ` (${game.blackElo})` : ""}</span>
        </p>
        {game.openingName && (
          <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-500">
            {game.eco}{game.openingName ? ` · ${game.openingName}` : ""}
          </p>
        )}
      </div>
      {hasMoves && (
        <svg className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-brand-500 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "lichess" | "twic";

export default function MasterGamesPage() {
  const [tab, setTab] = useState<Tab>("twic");

  // TWIC
  const [search, setSearch]             = useState("");
  const [tournaments, setTournaments]   = useState<TournamentSummary[]>([]);
  const [tourLoading, setTourLoading]   = useState(true);
  const [selectedTwic, setSelectedTwic] = useState<TournamentSummary | null>(null);
  const [twicGames, setTwicGames]       = useState<MasterGame[]>([]);
  const [twicLoading, setTwicLoading]   = useState(false);

  // Lichess
  const [broadcasts, setBroadcasts]       = useState<LichessBroadcastEntry[]>([]);
  const [bcastLoading, setBcastLoading]   = useState(true);
  const [selectedBcast, setSelectedBcast] = useState<LichessBroadcastEntry | null>(null);
  const [rounds, setRounds]               = useState<LichessRound[]>([]);
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState<LichessRound | null>(null);
  const [roundGames, setRoundGames]       = useState<ParsedBroadcastGame[]>([]);
  const [roundLoading, setRoundLoading]   = useState(false);

  // Shared viewer
  const [viewingGame, setViewingGame] = useState<MasterGame | null>(null);

  // TWIC effects
  useEffect(() => {
    setTourLoading(true);
    api.getTournamentList(search || undefined, 80)
      .then(setTournaments).catch(() => setTournaments([]))
      .finally(() => setTourLoading(false));
  }, [search]);

  useEffect(() => {
    if (!selectedTwic) { setTwicGames([]); return; }
    setTwicLoading(true);
    api.getMasterGames({ event: selectedTwic.event, limit: 100 })
      .then(setTwicGames).catch(() => setTwicGames([]))
      .finally(() => setTwicLoading(false));
  }, [selectedTwic]);

  // Lichess effects
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

  function toViewable(g: ParsedBroadcastGame): MasterGame {
    return {
      id: 0, white: g.white, black: g.black,
      white_elo: g.whiteElo, black_elo: g.blackElo,
      result: (["1-0","0-1","1/2-1/2"].includes(g.result) ? g.result : "1/2-1/2") as MasterGame["result"],
      eco: g.eco, opening_name: g.openingName, event: g.event, site: "",
      year: g.date ? parseInt(g.date.slice(0, 4)) || null : null,
      moves: g.moves,
    };
  }

  const totalGames = tournaments.reduce((s, t) => s + t.game_count, 0);

  // Mobile drill-down — which side to show when screen is narrow
  const twicShowDetail    = !!selectedTwic;
  const lichessShowDetail = !!selectedBcast;

  return (
    <>
      {viewingGame && <MasterGameViewerModal game={viewingGame} onClose={() => setViewingGame(null)} />}

      <div>
        {/* Header */}
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">GM Library</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">Tournaments</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Browse major chess tournaments and play through GM games
          </p>
        </div>

        {/* Tab bar — scrollable on very narrow screens */}
        <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-dark-border dark:bg-dark-elevated" style={{ width: "fit-content", maxWidth: "100%" }}>
          {([
            { id: "twic"    as Tab, label: "Archived", sublabel: "TWIC",    dot: <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />, beta: false },
            { id: "lichess" as Tab, label: "Live",     sublabel: "Lichess", dot: <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b05000]" />, beta: true },
          ]).map(({ id, label, sublabel, dot, beta }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all sm:px-4 ${
                tab === id
                  ? "bg-white shadow text-gray-900 dark:bg-dark-surface dark:text-gray-100 dark:shadow-black/40"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {dot}
              <span>{label}</span>
              <span className="hidden text-gray-400 sm:inline">· {sublabel}</span>
              {beta && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Beta
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TWIC tab ─────────────────────────────────────────────────────── */}
        {tab === "twic" && (
          <>
            {/* Description + search — only show on list view on mobile */}
            {!twicShowDetail && (
              <div className="mb-4">
                <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 dark:border-sky-900/40 dark:bg-sky-900/10">
                  <p className="text-sm font-medium text-sky-800 dark:text-sky-300">What is TWIC?</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-sky-700 dark:text-sky-400">
                    <span className="font-semibold">The Week in Chess</span> is a free weekly publication covering major chess tournaments worldwide since 1994. This library contains {totalGames.toLocaleString()} GM classical games (both players rated ≥ 2500) from the 2024–2026 archives, searchable by tournament.
                  </p>
                </div>
                <SearchInput
                  placeholder="Search — Tata Steel, Candidates, Bundesliga…"
                  onSearch={handleSearch}
                  defaultValue={search}
                  className="w-full max-w-xl"
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-600">
                  {tournaments.length} tournaments · updated weekly
                </p>
              </div>
            )}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
              {/* Tournament list — hidden on mobile when detail is open */}
              <div className={`${twicShowDetail ? "hidden lg:flex" : "flex"} w-full flex-col gap-2 lg:w-80 lg:shrink-0 xl:w-96`}>
                {tourLoading
                  ? <Skeleton rows={7} />
                  : tournaments.length === 0
                    ? <EmptyPanel label="No tournaments found." />
                    : tournaments.map((t) => (
                        <TwicTournamentCard key={t.event} t={t}
                          selected={selectedTwic?.event === t.event}
                          onClick={() => setSelectedTwic(t)}
                        />
                      ))
                }
              </div>

              {/* Game panel — hidden on mobile when nothing selected */}
              <div className={`${twicShowDetail ? "flex" : "hidden lg:flex"} w-full min-w-0 flex-col lg:flex-1`}>
                {!selectedTwic ? (
                  <EmptyPanel label="Select a tournament to view its games" />
                ) : (
                  <>
                    <BackButton onClick={() => setSelectedTwic(null)} label="All tournaments" />
                    <PanelHeader
                      title={selectedTwic.event}
                      subtitle={`${selectedTwic.year_min === selectedTwic.year_max ? selectedTwic.year_max : `${selectedTwic.year_min}–${selectedTwic.year_max}`} · ${selectedTwic.game_count} games`}
                      onClose={() => setSelectedTwic(null)}
                    />
                    {twicLoading ? <Skeleton rows={6} />
                      : twicGames.length === 0
                        ? <EmptyPanel label="No games found for this tournament." />
                        : <div className="space-y-2">
                            {twicGames.map((g) => (
                              <TwicGameRow key={g.id} game={g} onClick={() => g.moves?.trim() && setViewingGame(g)} />
                            ))}
                            {twicGames.length >= 100 && (
                              <p className="pt-1 text-center text-xs text-gray-400">Showing top 100 by rating.</p>
                            )}
                          </div>
                    }
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Lichess tab ──────────────────────────────────────────────────── */}
        {tab === "lichess" && (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
            {/* Broadcast list — hidden on mobile when a broadcast is selected */}
            <div className={`${lichessShowDetail ? "hidden lg:flex" : "flex"} w-full flex-col gap-2 lg:w-80 lg:shrink-0 xl:w-96`}>
              <p className="mb-1 text-xs text-gray-400 dark:text-gray-600">
                Live and recent major broadcasts from Lichess
              </p>
              {bcastLoading
                ? <Skeleton rows={7} h="h-20" />
                : broadcasts.map((entry) => (
                    <BroadcastCard key={entry.tour.id} entry={entry}
                      selected={selectedBcast?.tour.id === entry.tour.id}
                      onClick={() => { setSelectedBcast(entry); setSelectedRound(null); }}
                    />
                  ))
              }
            </div>

            {/* Detail panel — rounds + games */}
            <div className={`${lichessShowDetail ? "flex" : "hidden lg:flex"} w-full min-w-0 flex-col space-y-5 lg:flex-1`}>
              {!selectedBcast ? (
                <EmptyPanel label="Select a tournament to view its rounds" />
              ) : (
                <>
                  <BackButton onClick={() => { setSelectedBcast(null); setSelectedRound(null); }} label="All tournaments" />

                  <PanelHeader
                    title={selectedBcast.tour.name}
                    subtitle={[
                      formatBroadcastRange(selectedBcast.tour.dates),
                      selectedBcast.tour.info?.location,
                      selectedBcast.tour.info?.format,
                    ].filter(Boolean).join(" · ")}
                    onClose={() => { setSelectedBcast(null); setSelectedRound(null); }}
                  />

                  {/* Rounds */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-600">Rounds</p>
                    {roundsLoading
                      ? <Skeleton rows={3} h="h-10" />
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
                        {selectedRound.name} · Games
                      </p>
                      {roundLoading
                        ? <Skeleton rows={5} />
                        : roundGames.length === 0
                          ? <EmptyPanel label="No games available for this round yet." />
                          : <div className="space-y-2">
                              {roundGames.map((g, i) => (
                                <BroadcastGameRow key={i} game={g}
                                  onClick={() => { if (g.moves?.trim() && g.result !== "*") setViewingGame(toViewable(g)); }}
                                />
                              ))}
                            </div>
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
