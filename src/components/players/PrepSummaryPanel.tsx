"use client";

import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { PrepSummary, PrepTree, PrepTreeNode } from "@/types";

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

// ── Interactive tree (board + move picker) ───────────────────────────────────

interface InteractivePrepTreeProps {
  tree: PrepTree;
  orientation: "white" | "black";
  totalGames: number;
}

function InteractivePrepTree({ tree, orientation, totalGames }: InteractivePrepTreeProps) {
  const [path, setPath] = useState<string[]>([]);

  const { fen, lastFrom, lastTo } = computePosition(path);
  const nextMoves = findChildren(tree, path);
  const maxPct = nextMoves.length > 0 ? nextMoves[0].pct : 0;

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastFrom) squareStyles[lastFrom] = { backgroundColor: "rgba(255, 214, 10, 0.35)" };
  if (lastTo)   squareStyles[lastTo]   = { backgroundColor: "rgba(255, 214, 10, 0.55)" };

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
            className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Reset to start"
          >
            ⌂
          </button>
          {path.length === 0 ? (
            <span className="text-xs text-gray-400">Starting position</span>
          ) : (
            path.map((san, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="rounded px-1.5 py-0.5 font-mono text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-0.5 text-gray-400">{moveLabel(i)}</span>
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
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {nextMoves.length > 0
              ? `${nextMoves.length} move${nextMoves.length !== 1 ? "s" : ""} from here`
              : path.length === 0
              ? "No data"
              : "End of tree"}
          </span>
          {path.length > 0 && (
            <button
              onClick={() => setPath((p) => p.slice(0, -1))}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
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
                  className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-md active:scale-[0.99]"
                >
                  <span className="w-14 shrink-0 font-mono text-base font-bold text-gray-900 group-hover:text-brand-700">
                    {node.move}
                  </span>
                  <div className="flex-1">
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all group-hover:bg-brand-600"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block text-sm font-semibold text-gray-800">{node.pct}%</span>
                    <span className="block text-xs text-gray-400">{node.count}g</span>
                  </div>
                  <svg
                    className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-brand-400"
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
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            {path.length === 0 ? "No move data available." : "No further moves recorded at this depth."}
          </div>
        )}

        {totalGames > 0 && (
          <p className="mt-3 text-right text-xs text-gray-400">
            {totalGames} total game{totalGames !== 1 ? "s" : ""} · percentages relative to parent node
          </p>
        )}
      </div>
    </div>
  );
}

// ── Trend card ────────────────────────────────────────────────────────────────

function TrendCard({ trend }: { trend: PrepSummary["trends"][number] }) {
  const badge =
    trend.confidence === "high"
      ? "bg-amber-100 text-amber-700"
      : "bg-gray-100 text-gray-600";
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{trend.description}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {trend.color === "white" ? "White" : "Black"} · {trend.label}{trend.move}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
          {trend.confidence === "high" ? "Strong signal" : "Emerging"}
        </span>
      </div>
      <div className="mt-3 flex items-end gap-4">
        <div className="flex-1">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">Overall</p>
          <div className="h-2 overflow-hidden rounded bg-gray-100">
            <div className="h-full rounded bg-gray-400" style={{ width: `${trend.overall_pct}%` }} />
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{trend.overall_pct}%</p>
        </div>
        <div className="flex-1">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">Recent</p>
          <div className="h-2 overflow-hidden rounded bg-gray-100">
            <div className="h-full rounded bg-brand-500" style={{ width: `${trend.recent_pct}%` }} />
          </div>
          <p className="mt-0.5 text-xs font-medium text-gray-700">{trend.recent_pct}%</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">Shift</p>
          <p className="text-sm font-bold text-amber-600">+{trend.delta}pp</p>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function PrepSummaryPanel({ data }: { data: PrepSummary }) {
  const { meta, as_white, as_black, trends } = data;
  const [tab, setTab] = useState<"white" | "black">("white");

  const sourcesEntries = Object.entries(meta.source_counts).sort(
    ([, a], [, b]) => (b ?? 0) - (a ?? 0)
  );

  return (
    <div className="space-y-6">
      {/* Meta strip */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Games analyzed</p>
            <p className="text-2xl font-bold text-gray-900">{meta.total_games}</p>
          </div>
          {sourcesEntries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sourcesEntries.map(([src, n]) => (
                <span
                  key={src}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-700"
                >
                  <span className={`h-2 w-2 rounded-full ${sourceColor(src)}`} />
                  {sourceLabel(src)}: {n}
                </span>
              ))}
            </div>
          )}
          {(meta.date_range.first || meta.date_range.last) && (
            <div className="ml-auto text-right">
              <p className="text-xs uppercase tracking-wide text-gray-400">Date range</p>
              <p className="text-sm text-gray-700">
                {formatDate(meta.date_range.first)} – {formatDate(meta.date_range.last)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* No data */}
      {meta.total_games === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">No move data yet. Import games with move text first.</p>
        </div>
      )}

      {meta.total_games > 0 && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit">
            {(["white", "black"] as const).map((color) => {
              const count = color === "white" ? as_white.total : as_black.total;
              return (
                <button
                  key={color}
                  onClick={() => setTab(color)}
                  className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all ${
                    tab === color
                      ? "bg-white shadow text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span
                    className={`h-3 w-3 rounded-full border-2 ${
                      color === "white"
                        ? "border-gray-400 bg-white"
                        : "border-gray-600 bg-gray-800"
                    }`}
                  />
                  As {color === "white" ? "White" : "Black"}
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Board + tree */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            {tab === "white" ? (
              as_white.total === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No games as White.</p>
              ) : (
                <InteractivePrepTree
                  tree={as_white.opening_tree}
                  orientation="white"
                  totalGames={as_white.total}
                />
              )
            ) : (
              as_black.total === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No games as Black.</p>
              ) : (
                <InteractivePrepTree
                  tree={as_black.opening_tree}
                  orientation="black"
                  totalGames={as_black.total}
                />
              )
            )}
          </div>

          {/* Trends */}
          {trends.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-1 font-semibold text-gray-900">Recent trends</h3>
              <p className="mb-4 text-xs text-gray-500">
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
