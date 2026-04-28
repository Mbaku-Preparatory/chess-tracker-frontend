"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { MasterGame } from "@/types";

// ── PGN parsing ───────────────────────────────────────────────────────────────

interface ParsedMove {
  san: string;
  fen: string;
  moveNumber: number;
  color: "w" | "b";
}

function parseMoves(movesText: string): ParsedMove[] {
  const chess = new Chess();
  try {
    chess.loadPgn(movesText);
  } catch {
    return [];
  }
  const history = chess.history({ verbose: true });
  const parsed: ParsedMove[] = [];
  const replay = new Chess();
  for (const move of history) {
    replay.move(move.san);
    parsed.push({
      san: move.san,
      fen: replay.fen(),
      moveNumber: Math.ceil((parsed.length + 1) / 2),
      color: move.color,
    });
  }
  return parsed;
}

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  game: MasterGame;
  onClose: () => void;
}

export function MasterGameViewerModal({ game, onClose }: Props) {
  const moves = parseMoves(game.moves);
  const [idx, setIdx] = useState(-1); // -1 = starting position
  const moveListRef = useRef<HTMLDivElement>(null);
  const activeMoveRef = useRef<HTMLButtonElement>(null);

  const currentFen = idx === -1 ? STARTING_FEN : moves[idx]?.fen ?? STARTING_FEN;
  const lastFrom = idx >= 0 ? undefined : undefined; // no highlight needed for simplicity

  const goTo = useCallback((i: number) => {
    setIdx(Math.max(-1, Math.min(moves.length - 1, i)));
  }, [moves.length]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft")  { e.preventDefault(); goTo(idx - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(idx + 1); }
      if (e.key === "Escape")     { onClose(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, goTo, onClose]);

  // Scroll active move into view
  useEffect(() => {
    activeMoveRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [idx]);

  const resultLabel = game.result === "1/2-1/2" ? "½–½"
    : game.result === "1-0" ? "1–0" : "0–1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-dark-surface sm:flex-row sm:max-h-[90vh]">

        {/* ── Left: board ─────────────────────────────────────────── */}
        <div className="w-full sm:w-[52%]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-dark-border">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {game.white} <span className="font-normal text-gray-400">vs</span> {game.black}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {game.eco}{game.opening_name ? ` · ${game.opening_name}` : ""}
                {game.event ? ` · ${game.event}` : ""}
                {game.year ? ` ${game.year}` : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-3 shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-elevated dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Board */}
          <div className="p-3">
            <Chessboard
              options={{
                position: currentFen,
                allowDragging: false,
                boardOrientation: "white",
                darkSquareStyle: { backgroundColor: "#4a7c59" },
                lightSquareStyle: { backgroundColor: "#f0d9b5" },
                animationDurationInMs: 100,
                boardStyle: { borderRadius: "8px" },
              }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 border-t border-gray-100 px-4 py-3 dark:border-dark-border">
            <button onClick={() => goTo(-1)} disabled={idx === -1}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:border-dark-border dark:hover:bg-dark-elevated">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={() => goTo(idx - 1)} disabled={idx === -1}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:border-dark-border dark:hover:bg-dark-elevated">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="min-w-[60px] text-center text-xs text-gray-400 dark:text-gray-500">
              {idx === -1 ? "Start" : `Move ${moves[idx].moveNumber}`}
            </span>
            <button onClick={() => goTo(idx + 1)} disabled={idx >= moves.length - 1}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:border-dark-border dark:hover:bg-dark-elevated">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={() => goTo(moves.length - 1)} disabled={idx >= moves.length - 1}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:border-dark-border dark:hover:bg-dark-elevated">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M6 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Right: move list ─────────────────────────────────────── */}
        <div className="flex min-h-0 w-full flex-col overflow-hidden border-t border-gray-100 sm:w-[48%] sm:border-l sm:border-t-0 dark:border-dark-border">
          {/* Player info */}
          <div className="border-b border-gray-100 px-4 py-3 dark:border-dark-border">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{game.white}</p>
                {game.white_elo && <p className="text-xs text-gray-400">{game.white_elo}</p>}
              </div>
              <span className={`rounded-lg px-3 py-1 text-sm font-bold ${
                game.result === "1-0" ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : game.result === "0-1" ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "bg-gray-200 text-gray-700 dark:bg-dark-elevated dark:text-gray-300"
              }`}>{resultLabel}</span>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{game.black}</p>
                {game.black_elo && <p className="text-xs text-gray-400">{game.black_elo}</p>}
              </div>
            </div>
          </div>

          {/* Moves */}
          <div ref={moveListRef} className="min-h-0 flex-1 overflow-y-auto p-3">
            {moves.length === 0 ? (
              <p className="text-center text-xs text-gray-400 dark:text-gray-600">No moves available</p>
            ) : (
              <div className="grid grid-cols-[auto_1fr_1fr] gap-x-1 gap-y-0.5 font-mono text-sm">
                {Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => {
                  const w = moves[i * 2];
                  const b = moves[i * 2 + 1];
                  const wIdx = i * 2;
                  const bIdx = i * 2 + 1;
                  return (
                    <div key={i} className="contents">
                      <span className="select-none pr-1 text-right text-xs text-gray-400 dark:text-gray-600 leading-7">
                        {i + 1}.
                      </span>
                      <button
                        ref={idx === wIdx ? activeMoveRef : undefined}
                        onClick={() => goTo(wIdx)}
                        className={`rounded px-2 py-0.5 text-left transition-colors ${
                          idx === wIdx
                            ? "bg-brand-600 text-white"
                            : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-elevated"
                        }`}
                      >
                        {w.san}
                      </button>
                      {b ? (
                        <button
                          ref={idx === bIdx ? activeMoveRef : undefined}
                          onClick={() => goTo(bIdx)}
                          className={`rounded px-2 py-0.5 text-left transition-colors ${
                            idx === bIdx
                              ? "bg-brand-600 text-white"
                              : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-elevated"
                          }`}
                        >
                          {b.san}
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-2 text-center text-[10px] text-gray-400 dark:border-dark-border dark:text-gray-600">
            ← → arrow keys to navigate
          </div>
        </div>
      </div>
    </div>
  );
}
