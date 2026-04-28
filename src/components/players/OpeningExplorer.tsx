"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PgnViewerModal } from "@/components/players/PgnViewerModal";
import type {
  OpeningExplorerData,
  ExplorerEngineMove,
  ExplorerDbGame,
  Game,
  ColorChoice,
  GameResult,
  GameSource,
  MasterGame,
} from "@/types";

// ── W/D/B segmented bar ───────────────────────────────────────────────────────

function WDBBar({
  white,
  draw,
  black,
  playerColor,
}: {
  white: number;
  draw: number;
  black: number;
  playerColor: ColorChoice;
}) {
  return (
    <div>
      <div className="flex h-8 w-full overflow-hidden rounded-lg text-[11px] font-bold">
        {white > 0 && (
          <div
            style={{ width: `${white}%` }}
            className="flex items-center justify-center bg-gray-200 text-gray-700 dark:bg-gray-300 dark:text-gray-800 transition-all"
          >
            {white >= 7 && `${white}%`}
          </div>
        )}
        {draw > 0 && (
          <div
            style={{ width: `${draw}%` }}
            className="flex items-center justify-center bg-gray-400 text-white dark:bg-gray-500 transition-all"
          >
            {draw >= 7 && `${draw}%`}
          </div>
        )}
        {black > 0 && (
          <div
            style={{ width: `${black}%` }}
            className="flex items-center justify-center bg-gray-700 text-white dark:bg-gray-800 transition-all"
          >
            {black >= 7 && `${black}%`}
          </div>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
        <span className={playerColor === "white" ? "font-bold text-gray-700 dark:text-gray-200" : ""}>
          {white}% White
        </span>
        <span>{draw}% Draw</span>
        <span className={playerColor === "black" ? "font-bold text-gray-700 dark:text-gray-200" : ""}>
          {black}% Black
        </span>
      </div>
    </div>
  );
}

// ── Engine move row ───────────────────────────────────────────────────────────

function scoreToCp(score: number | null): string {
  if (score === null) return "";
  const pawns = score / 100;
  if (pawns === 0) return "0.00";
  return (pawns > 0 ? "+" : "") + pawns.toFixed(2);
}

function EngineMoveRow({ move, index }: { move: ExplorerEngineMove; index: number }) {
  const cpText = scoreToCp(move.score);
  const winrate = move.winrate ? parseFloat(move.winrate) : null;
  const isTop = index === 0;

  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
      isTop
        ? "bg-brand-50 dark:bg-brand-900/20"
        : "bg-white dark:bg-dark-surface"
    }`}>
      {/* Move SAN */}
      <span className={`w-10 shrink-0 font-mono text-sm font-bold ${
        isTop ? "text-brand-700 dark:text-brand-400" : "text-gray-800 dark:text-gray-200"
      }`}>
        {move.san}
      </span>

      {/* Winrate bar */}
      {winrate !== null && (
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-elevated">
          <div
            className="h-full rounded-full bg-emerald-400 dark:bg-emerald-500"
            style={{ width: `${Math.min(100, winrate)}%` }}
          />
        </div>
      )}

      {/* Winrate % */}
      {winrate !== null && (
        <span className="w-10 shrink-0 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
          {winrate.toFixed(0)}%
        </span>
      )}

      {/* Engine score */}
      {cpText && (
        <span className={`shrink-0 font-mono text-xs ${
          move.score !== null && move.score > 0
            ? "text-emerald-600 dark:text-emerald-400"
            : move.score !== null && move.score < 0
            ? "text-red-500 dark:text-red-400"
            : "text-gray-400"
        }`}>
          {cpText}
        </span>
      )}

      {/* Best move badge */}
      {isTop && (
        <span className="shrink-0 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
          Best
        </span>
      )}
    </div>
  );
}

// ── Database game row ─────────────────────────────────────────────────────────

const RESULT_ICON: Record<GameResult, { icon: string; cls: string }> = {
  win: { icon: "●", cls: "text-emerald-600 dark:text-emerald-400" },
  loss: { icon: "●", cls: "text-red-500 dark:text-red-400" },
  draw: { icon: "½", cls: "text-amber-600 dark:text-amber-400" },
};

function DbGameRow({
  game,
  onOpen,
}: {
  game: ExplorerDbGame;
  onOpen: (g: ExplorerDbGame) => void;
}) {
  const ri = RESULT_ICON[game.result];
  const year = game.date_played ? game.date_played.slice(0, 4) : null;

  return (
    <button
      onClick={() => game.pgn_available && onOpen(game)}
      disabled={!game.pgn_available}
      className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
        game.pgn_available
          ? "hover:bg-white dark:hover:bg-dark-surface cursor-pointer"
          : "cursor-default opacity-70"
      }`}
      title={game.pgn_available ? "View game" : "No moves recorded"}
    >
      {/* Result dot */}
      <span className={`shrink-0 text-base font-bold leading-none ${ri.cls}`} aria-label={game.result}>
        {ri.icon}
      </span>

      {/* Players */}
      <div className="min-w-0 flex-1">
        <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
          {game.player_name}
          <span className="mx-1 font-normal text-gray-400">vs</span>
          {game.opponent_name}
          {game.opponent_rating && (
            <span className="ml-1 text-gray-400">({game.opponent_rating})</span>
          )}
        </span>
      </div>

      {/* Color played */}
      <span className={`shrink-0 h-2.5 w-2.5 rounded-full border ${
        game.color_played === "white"
          ? "border-gray-400 bg-white"
          : "border-gray-600 bg-gray-700 dark:border-gray-400 dark:bg-gray-300"
      }`} />

      {/* Year */}
      {year && (
        <span className="shrink-0 text-gray-400">{year}</span>
      )}

      {/* Event (truncated) */}
      {game.event && (
        <span className="hidden sm:block shrink-0 max-w-[120px] truncate text-gray-400" title={game.event}>
          {game.event}
        </span>
      )}

      {/* PGN available indicator */}
      {game.pgn_available && (
        <svg
          className="h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-brand-500 transition-colors dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </button>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ExplorerSkeleton() {
  return (
    <div className="animate-pulse space-y-4 px-4 py-4">
      {/* WDB bar skeleton */}
      <div className="h-8 w-full rounded-lg bg-gray-200 dark:bg-dark-elevated" />
      <div className="flex justify-between">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-3 w-16 rounded bg-gray-100 dark:bg-dark-elevated" />
        ))}
      </div>
      {/* Moves skeleton */}
      <div className="space-y-1.5 pt-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 rounded-lg bg-gray-100 dark:bg-dark-elevated" />
        ))}
      </div>
      {/* Games skeleton */}
      <div className="space-y-1 pt-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-7 rounded-lg bg-gray-100 dark:bg-dark-elevated" />
        ))}
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count?: number | string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </span>
      {count !== undefined && (
        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-dark-elevated dark:text-gray-500">
          {count}
        </span>
      )}
    </div>
  );
}

// ── Build a minimal Game object for PgnViewerModal ────────────────────────────

function toGameObject(g: ExplorerDbGame): Game {
  return {
    id: g.id,
    event: g.event,
    site: "",
    round: g.round,
    date_played: g.date_played,
    opponent_name: g.opponent_name,
    opponent_rating: g.opponent_rating ?? null,
    color_played: g.color_played,
    result: g.result,
    eco_code: null,
    opening_name: g.opening_name || null,
    opening_family: null,
    num_moves: null,
    time_control: null,
    moves_preview: "",
    source: "chess_results" as GameSource,
    source_url: null,
    notes: null,
  };
}

// ── Master game row ───────────────────────────────────────────────────────────

const RESULT_COLOR: Record<string, string> = {
  "1-0":     "text-emerald-600 dark:text-emerald-400",
  "0-1":     "text-red-500    dark:text-red-400",
  "1/2-1/2": "text-amber-600  dark:text-amber-400",
};

const RESULT_LABEL: Record<string, string> = {
  "1-0": "1-0", "0-1": "0-1", "1/2-1/2": "½-½",
};

function MasterGameRow({ game }: { game: MasterGame }) {
  const resultCls = RESULT_COLOR[game.result] ?? "text-gray-500";
  const resultLabel = RESULT_LABEL[game.result] ?? game.result;

  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-white dark:hover:bg-dark-surface">
      {/* Result */}
      <span className={`w-7 shrink-0 font-mono font-bold ${resultCls}`}>
        {resultLabel}
      </span>

      {/* Players */}
      <div className="min-w-0 flex-1">
        <span className="font-medium text-gray-800 dark:text-gray-200">
          {game.white}
          {game.white_elo ? <span className="ml-0.5 font-normal text-gray-400">({game.white_elo})</span> : null}
        </span>
        <span className="mx-1 text-gray-300 dark:text-gray-600">vs</span>
        <span className="font-medium text-gray-800 dark:text-gray-200">
          {game.black}
          {game.black_elo ? <span className="ml-0.5 font-normal text-gray-400">({game.black_elo})</span> : null}
        </span>
      </div>

      {/* Event + year */}
      <span className="hidden shrink-0 max-w-[110px] truncate text-gray-400 sm:block" title={game.event}>
        {game.event || game.site}
      </span>
      {game.year && (
        <span className="shrink-0 text-gray-400">{game.year}</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OpeningExplorer({
  slug,
  ecoCode,
  openingName,
  playerColor,
}: {
  slug: string;
  ecoCode: string;
  openingName: string;
  playerColor: ColorChoice;
}) {
  const [data, setData] = useState<OpeningExplorerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllMoves, setShowAllMoves] = useState(false);
  const [viewingGame, setViewingGame] = useState<Game | null>(null);
  const [masterGames, setMasterGames] = useState<MasterGame[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    api
      .getOpeningExplorer(slug, ecoCode, openingName)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err.message ?? "Failed to load explorer."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, ecoCode, openingName]);

  useEffect(() => {
    let cancelled = false;
    setMasterLoading(true);
    setMasterGames([]);
    api
      .getMasterGames(ecoCode, 10)
      .then((games) => { if (!cancelled) setMasterGames(games); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMasterLoading(false); });
    return () => { cancelled = true; };
  }, [ecoCode]);

  if (loading) return <ExplorerSkeleton />;

  if (error) {
    return (
      <div className="px-4 py-3 text-xs text-red-500 dark:text-red-400">{error}</div>
    );
  }

  if (!data) return null;

  const { db_stats, engine_moves, top_games, lichess_opening_url } = data;
  const hasStats = db_stats.total > 0;
  const hasEngine = engine_moves.length > 0;
  const hasGames = top_games.length > 0;
  const visibleMoves = showAllMoves ? engine_moves : engine_moves.slice(0, 3);

  return (
    <>
      {viewingGame && (
        <PgnViewerModal game={viewingGame} onClose={() => setViewingGame(null)} />
      )}

      <div className="space-y-5 px-4 pb-5 pt-4">

        {/* ── Community stats ──────────────────────────────────────────────── */}
        <div>
          <SectionHeader
            label="In this tracker"
            count={hasStats ? `${db_stats.total} game${db_stats.total !== 1 ? "s" : ""}` : "no games yet"}
          />
          {hasStats ? (
            <WDBBar
              white={db_stats.white_pct}
              draw={db_stats.draw_pct}
              black={db_stats.black_pct}
              playerColor={playerColor}
            />
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-600">
              No games with this opening have been imported yet.
            </p>
          )}
        </div>

        {/* ── Engine best moves ─────────────────────────────────────────────── */}
        {hasEngine && (
          <div>
            <SectionHeader label="Theory — best moves" />
            <div className="space-y-1">
              {visibleMoves.map((mv, i) => (
                <EngineMoveRow key={mv.uci || mv.san} move={mv} index={i} />
              ))}
            </div>
            {engine_moves.length > 3 && (
              <button
                onClick={() => setShowAllMoves((v) => !v)}
                className="mt-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showAllMoves ? "Show fewer moves" : `+${engine_moves.length - 3} more moves`}
              </button>
            )}
            <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-600">
              Engine analysis via ChessDB · winrate from database positions
            </p>
          </div>
        )}

        {/* ── Recent games in this tracker ─────────────────────────────────── */}
        {hasGames && (
          <div>
            <SectionHeader label="Recent games" count={top_games.length} />
            <div className="rounded-lg border border-gray-100 bg-gray-50/60 dark:border-dark-border dark:bg-dark-elevated">
              {top_games.map((g, i) => (
                <div key={g.id}>
                  {i > 0 && <div className="mx-3 border-t border-gray-100 dark:border-dark-border" />}
                  <DbGameRow game={g} onOpen={(game) => setViewingGame(toGameObject(game))} />
                </div>
              ))}
            </div>
            {top_games.some((g) => g.pgn_available) && (
              <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-600">
                Click a game to view moves
              </p>
            )}
          </div>
        )}

        {/* ── Lichess study link ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-dark-border">
          <span className="text-xs text-gray-400 dark:text-gray-500">Study theory on Lichess</span>
          <a
            href={lichess_opening_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{ borderColor: "#b05000", color: "#b05000" }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M19 22H5v-2h14v2M13 2a3 3 0 00-3 3c0 .88.39 1.67 1 2.22V8l-3 1-2 4h2v1H6l-1 3h14l-1-3h-2v-1h2l-2-4-3-1V7.22c.61-.55 1-1.34 1-2.22a3 3 0 00-1-2.24V2h-1z" />
            </svg>
            Open on Lichess
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* ── GM master games ───────────────────────────────────────────────── */}
        {(masterLoading || masterGames.length > 0) && (
          <div>
            <SectionHeader label="GM reference games" count={masterLoading ? "…" : masterGames.length} />
            {masterLoading ? (
              <div className="space-y-1 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-7 rounded-lg bg-gray-100 dark:bg-dark-elevated" />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-100 bg-gray-50/60 dark:border-dark-border dark:bg-dark-elevated">
                {masterGames.map((g, i) => (
                  <div key={g.id}>
                    {i > 0 && <div className="mx-3 border-t border-gray-100 dark:border-dark-border" />}
                    <MasterGameRow game={g} />
                  </div>
                ))}
              </div>
            )}
            {!masterLoading && masterGames.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-600">
                No GM games imported for this opening yet.
              </p>
            )}
          </div>
        )}

      </div>
    </>
  );
}
