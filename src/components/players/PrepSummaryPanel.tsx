"use client";

import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { api } from "@/lib/api";
import { PgnViewerModal } from "@/components/players/PgnViewerModal";
import { ColorBadge, ResultBadge } from "@/components/ui/Badge";
import type { PrepSummary, PrepTree, PrepTreeNode, Game } from "@/types";

// ── Chess helpers ─────────────────────────────────────────────────────────────

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function computePosition(movePath: string[]): {
  fen: string;
  lastFrom?: string;
  lastTo?: string;
} {
  const chess = new Chess();
  let lastFrom: string | undefined;
  let lastTo: string | undefined;
  for (const san of movePath) {
    try {
      const result = chess.move(san);
      if (!result) break;
      lastFrom = result.from;
      lastTo = result.to;
    } catch {
      break;
    }
  }
  return { fen: chess.fen(), lastFrom, lastTo };
}

function findChildren(tree: PrepTree, path: string[]): PrepTreeNode[] {
  let children = tree.children;
  for (const move of path) {
    const node = children.find((c) => c.move === move);
    if (!node) return [];
    children = node.children;
  }
  return children;
}

// half-move index → "1." / "1..." / "2." / etc.
function moveLabel(index: number): string {
  const num = Math.floor(index / 2) + 1;
  return index % 2 === 0 ? `${num}.` : `${num}…`;
}

// ── Meta helpers ──────────────────────────────────────────────────────────────

function sourceLabel(s: string) {
  const m: Record<string, string> = {
    chess_results: "OTB",
    chess_com: "Chess.com",
    lichess: "Lichess",
    pgn_import: "PGN",
    manual: "Manual",
  };
  return m[s] ?? s;
}

function sourceColor(s: string) {
  const m: Record<string, string> = {
    chess_results: "bg-amber-500",
    chess_com: "bg-emerald-500",
    lichess: "bg-violet-500",
    pgn_import: "bg-blue-400",
    manual: "bg-gray-400",
  };
  return m[s] ?? "bg-gray-400";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "short" });
}

// ── Game row ─────────────────────────────────────────────────────────────────

function sourceMeta(source: string): { label: string; dot: string } {
  const map: Record<string, { label: string; dot: string }> = {
    chess_results: { label: "OTB", dot: "bg-amber-500" },
    chess_com:     { label: "Chess.com", dot: "bg-emerald-500" },
    lichess:       { label: "Lichess", dot: "bg-violet-500" },
    pgn_import:    { label: "PGN", dot: "bg-blue-400" },
    manual:        { label: "Manual", dot: "bg-gray-400" },
  };
  return map[source] ?? { label: source, dot: "bg-gray-400" };
}

function GameRow({
  game,
  onOpenViewer,
}: {
  game: Game;
  onOpenViewer: (g: Game) => void;
}) {
  const { label, dot } = sourceMeta(game.source);
  const isOnline = game.source === "chess_com" || game.source === "lichess";
  const dateStr = game.date_played
    ? new Date(game.date_played).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const inner = (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left transition hover:bg-gray-50 dark:border-dark-border dark:bg-dark-surface dark:hover:bg-dark-elevated">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
          vs {game.opponent_name}
          {game.opponent_rating && (
            <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">({game.opponent_rating})</span>
          )}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {label}{dateStr ? ` · ${dateStr}` : ""}{game.opening_name ? ` · ${game.opening_name}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <ColorBadge color={game.color_played} />
        <ResultBadge result={game.result} />
      </div>
      {isOnline ? (
        <svg className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );

  if (isOnline && game.source_url) {
    return (
      <a href={game.source_url} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }

  return (
    <button className="w-full" onClick={() => onOpenViewer(game)}>
      {inner}
    </button>
  );
}

// ── Interactive tree (board + move picker) ───────────────────────────────────

interface InteractivePrepTreeProps {
  tree: PrepTree;
  orientation: "white" | "black";
  totalGames: number;
  slug: string;
  color: "white" | "black";
}

function InteractivePrepTree({ tree, orientation, totalGames, slug, color }: InteractivePrepTreeProps) {
  const [path, setPath] = useState<string[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gamesTotal, setGamesTotal] = useState(0);
  const [gamesPage, setGamesPage] = useState(1);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [viewerGame, setViewerGame] = useState<Game | null>(null);
  const [downloading, setDownloading] = useState(false);
  const fetchRef = useRef(0);

  const { fen, lastFrom, lastTo } = computePosition(path);
  const nextMoves = findChildren(tree, path);
  const maxPct = nextMoves.length > 0 ? nextMoves[0].pct : 0;

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastFrom) squareStyles[lastFrom] = { backgroundColor: "rgba(255, 214, 10, 0.35)" };
  if (lastTo)   squareStyles[lastTo]   = { backgroundColor: "rgba(255, 214, 10, 0.55)" };

  // Fetch games matching current line whenever path changes
  useEffect(() => {
    const id = ++fetchRef.current;
    setGamesPage(1);
    setGamesLoading(true);
    api.getPrepGames(slug, path, color, 1).then((res) => {
      if (fetchRef.current !== id) return;
      setGames(res.results);
      setGamesTotal(res.count);
      setGamesPage(1);
    }).catch(() => {}).finally(() => {
      if (fetchRef.current === id) setGamesLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  function loadMoreGames() {
    const nextPage = gamesPage + 1;
    setGamesLoading(true);
    api.getPrepGames(slug, path, color, nextPage).then((res) => {
      setGames((prev) => [...prev, ...res.results]);
      setGamesPage(nextPage);
    }).catch(() => {}).finally(() => setGamesLoading(false));
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await api.downloadPrepGamesPgn(slug, path, color);
    } catch { /* ignore */ } finally {
      setDownloading(false);
    }
  }

  function select(move: string) {
    setPath((prev) => [...prev, move]);
  }

  function goTo(index: number) {
    setPath((prev) => prev.slice(0, index + 1));
  }

  function reset() {
    setPath([]);
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      {/* ── Left: Board ───────────────────────────────────────────────── */}
      <div className="w-full sm:w-1/2 sm:sticky sm:top-4 sm:max-w-[420px]">
        {/* Current line breadcrumb */}
        <div className="mb-2 flex min-h-[28px] flex-wrap items-center gap-1">
          <button
            onClick={reset}
            className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-dark-elevated dark:hover:text-gray-300"
            title="Reset to start"
          >
            ⌂
          </button>
          {path.length === 0 ? (
            <span className="text-xs text-gray-400 dark:text-gray-500">Starting position</span>
          ) : (
            path.map((san, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="rounded px-1.5 py-0.5 font-mono text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-elevated"
              >
                <span className="mr-0.5 text-gray-400 dark:text-gray-500">{moveLabel(i)}</span>
                {san}
              </button>
            ))
          )}
        </div>

        {/* Board */}
        <div className="overflow-hidden rounded-xl shadow-lg">
          <Chessboard
            options={{
              position: fen,
              boardOrientation: orientation,
              allowDragging: false,
              squareStyles,
              darkSquareStyle: { backgroundColor: "#4a7c59" },
              lightSquareStyle: { backgroundColor: "#f0d9b5" },
              animationDurationInMs: 150,
              boardStyle: { borderRadius: "12px" },
            }}
          />
        </div>
      </div>

      {/* ── Right: Move picker ────────────────────────────────────────── */}
      <div className="w-full sm:w-1/2">
        {/* Header row */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {nextMoves.length > 0
              ? `${nextMoves.length} move${nextMoves.length !== 1 ? "s" : ""} from here`
              : path.length === 0
              ? "No data"
              : "End of tree"}
          </span>
          {path.length > 0 && (
            <button
              onClick={() => setPath((p) => p.slice(0, -1))}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-dark-border dark:text-gray-400 dark:hover:bg-dark-elevated"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
        </div>

        {/* Move rows */}
        {nextMoves.length > 0 ? (
          <div className="space-y-2">
            {nextMoves.map((node) => {
              const barWidth = maxPct > 0 ? (node.pct / maxPct) * 100 : 0;
              return (
                <button
                  key={node.move}
                  onClick={() => select(node.move)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-md active:scale-[0.99] dark:border-dark-border dark:bg-dark-surface dark:hover:border-brand-700 dark:hover:bg-brand-900/20"
                >
                  <span className="w-14 shrink-0 font-mono text-base font-bold text-gray-900 group-hover:text-brand-700 dark:text-gray-100 dark:group-hover:text-brand-400">
                    {node.move}
                  </span>
                  <div className="flex-1">
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-elevated">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all group-hover:bg-brand-600 dark:bg-brand-600 dark:group-hover:bg-brand-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-gray-200">{node.pct}%</span>
                    <span className="block text-xs text-gray-400 dark:text-gray-500">{node.count}g</span>
                  </div>
                  <svg
                    className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-brand-400 dark:text-gray-600 dark:group-hover:text-brand-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400 dark:border-dark-border dark:text-gray-600">
            {path.length === 0 ? "No move data available." : "No further moves recorded at this depth."}
          </div>
        )}

        {totalGames > 0 && (
          <p className="mt-3 text-right text-xs text-gray-400 dark:text-gray-600">
            {totalGames} total game{totalGames !== 1 ? "s" : ""} · percentages relative to parent node
          </p>
        )}

        {/* ── Games panel ───────────────────────────────────────────── */}
        <div className="mt-6 border-t border-gray-100 pt-5 dark:border-dark-border">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {gamesLoading && games.length === 0
                ? "Loading games…"
                : `${gamesTotal} game${gamesTotal !== 1 ? "s" : ""} in this line`}
            </h4>
            {gamesTotal > 0 && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-dark-border dark:text-gray-400 dark:hover:bg-dark-elevated"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {downloading ? "Downloading…" : "Download PGN"}
              </button>
            )}
          </div>

          {games.length > 0 && (
            <div className="space-y-2">
              {games.map((game) => (
                <GameRow
                  key={game.id}
                  game={game}
                  onOpenViewer={setViewerGame}
                />
              ))}
              {games.length < gamesTotal && (
                <button
                  onClick={loadMoreGames}
                  disabled={gamesLoading}
                  className="w-full rounded-lg border border-dashed border-gray-200 py-2 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-dark-border dark:text-gray-500 dark:hover:bg-dark-elevated"
                >
                  {gamesLoading ? "Loading…" : `Show more (${gamesTotal - games.length} remaining)`}
                </button>
              )}
            </div>
          )}

          {!gamesLoading && games.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-600">No games recorded for this line.</p>
          )}
        </div>
      </div>

      {/* PGN viewer modal for OTB / imported games */}
      {viewerGame && (
        <PgnViewerModal game={viewerGame} onClose={() => setViewerGame(null)} />
      )}
    </div>
  );
}

// ── Trend card ────────────────────────────────────────────────────────────────

function TrendCard({ trend }: { trend: PrepSummary["trends"][number] }) {
  const badge =
    trend.confidence === "high"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
      : "bg-gray-100 text-gray-600 dark:bg-dark-elevated dark:text-gray-400";
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{trend.description}</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">
            {trend.color === "white" ? "White" : "Black"} · {trend.label}{trend.move}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
          {trend.confidence === "high" ? "Strong signal" : "Emerging"}
        </span>
      </div>
      <div className="mt-3 flex items-end gap-4">
        <div className="flex-1">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-600">Overall</p>
          <div className="h-2 overflow-hidden rounded bg-gray-100 dark:bg-dark-elevated">
            <div className="h-full rounded bg-gray-400 dark:bg-gray-600" style={{ width: `${trend.overall_pct}%` }} />
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">{trend.overall_pct}%</p>
        </div>
        <div className="flex-1">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-600">Recent</p>
          <div className="h-2 overflow-hidden rounded bg-gray-100 dark:bg-dark-elevated">
            <div className="h-full rounded bg-brand-500" style={{ width: `${trend.recent_pct}%` }} />
          </div>
          <p className="mt-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">{trend.recent_pct}%</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-600">Shift</p>
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">+{trend.delta}pp</p>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function PrepSummaryPanel({ data, slug }: { data: PrepSummary; slug: string }) {
  const { meta, as_white, as_black, trends } = data;
  const [tab, setTab] = useState<"white" | "black">("white");

  const sourcesEntries = Object.entries(meta.source_counts).sort(
    ([, a], [, b]) => (b ?? 0) - (a ?? 0)
  );

  return (
    <div className="space-y-6">
      {/* Meta strip */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Games analyzed</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{meta.total_games}</p>
          </div>
          {sourcesEntries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sourcesEntries.map(([src, n]) => (
                <span
                  key={src}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-700 dark:border-dark-border dark:text-gray-300"
                >
                  <span className={`h-2 w-2 rounded-full ${sourceColor(src)}`} />
                  {sourceLabel(src)}: {n}
                </span>
              ))}
            </div>
          )}
          {(meta.date_range.first || meta.date_range.last) && (
            <div className="ml-auto text-right">
              <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Date range</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {formatDate(meta.date_range.first)} – {formatDate(meta.date_range.last)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* No data */}
      {meta.total_games === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-dark-border">
          <p className="text-sm text-gray-500 dark:text-gray-500">No move data yet. Import games with move text first.</p>
        </div>
      )}

      {meta.total_games > 0 && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit dark:border-dark-border dark:bg-dark-elevated">
            {(["white", "black"] as const).map((color) => {
              const count = color === "white" ? as_white.total : as_black.total;
              return (
                <button
                  key={color}
                  onClick={() => setTab(color)}
                  className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all ${
                    tab === color
                      ? "bg-white shadow text-gray-900 dark:bg-dark-surface dark:text-gray-100 dark:shadow-black/40"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <span
                    className={`h-3 w-3 rounded-full border-2 ${
                      color === "white"
                        ? "border-gray-400 bg-white"
                        : "border-gray-500 bg-gray-700 dark:border-gray-400 dark:bg-gray-300"
                    }`}
                  />
                  As {color === "white" ? "White" : "Black"}
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-dark-muted dark:text-gray-400">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Board + tree */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            {tab === "white" ? (
              as_white.total === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8 dark:text-gray-600">No games as White.</p>
              ) : (
                <InteractivePrepTree
                  key="white"
                  tree={as_white.opening_tree}
                  orientation="white"
                  totalGames={as_white.total}
                  slug={slug}
                  color="white"
                />
              )
            ) : (
              as_black.total === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8 dark:text-gray-600">No games as Black.</p>
              ) : (
                <InteractivePrepTree
                  key="black"
                  tree={as_black.opening_tree}
                  orientation="black"
                  totalGames={as_black.total}
                  slug={slug}
                  color="black"
                />
              )
            )}
          </div>

          {/* Trends */}
          {trends.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface">
              <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">Recent trends</h3>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-500">
                Comparing the most recent 15 games against the full dataset.
              </p>
              <div className="space-y-3">
                {trends.map((t, i) => (
                  <TrendCard key={i} trend={t} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
