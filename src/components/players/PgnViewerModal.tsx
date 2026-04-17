"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { Game } from "@/types";
import { api } from "@/lib/api";
import { ColorBadge, ResultBadge } from "@/components/ui/Badge";

function pgnFilename(game: Game): string {
  const opp = game.opponent_name.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");
  const date = game.date_played ? game.date_played.replace(/-/g, "") : "unknown";
  return `${opp}_${date}_${game.result}.pgn`;
}

interface PgnViewerModalProps {
  game: Game;
  onClose: () => void;
}

interface ParsedMove {
  san: string;
  fen: string;
  moveNumber: number;
  color: "w" | "b";
}

function parsePgn(pgn: string): ParsedMove[] {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return [];
  }
  const history = chess.history({ verbose: true });
  const moves: ParsedMove[] = [];
  const replay = new Chess();
  for (const move of history) {
    replay.move(move.san);
    moves.push({
      san: move.san,
      fen: replay.fen(),
      moveNumber: Math.ceil((moves.length + 1) / 2),
      color: move.color,
    });
  }
  return moves;
}

export function PgnViewerModal({ game, onClose }: PgnViewerModalProps) {
  const [pgn, setPgn] = useState<string | null>(null);
  const [moves, setMoves] = useState<ParsedMove[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = starting position
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const moveListRef = useRef<HTMLDivElement>(null);
  const activeMoveRef = useRef<HTMLButtonElement>(null);

  function handleDownload() {
    if (!pgn) return;
    const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pgnFilename(game);
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    if (!pgn) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${game.opponent_name} — ${game.result}`,
          text: pgn,
        });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(pgn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Fetch PGN on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getGamePgn(game.id)
      .then((data) => {
        if (cancelled) return;
        const parsed = parsePgn(data.pgn_text);
        setPgn(data.pgn_text);
        setMoves(parsed);
        setCurrentIndex(-1);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load PGN");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game.id]);

  // Scroll active move into view
  useEffect(() => {
    activeMoveRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentIndex]);

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(-1, Math.min(index, moves.length - 1)));
    },
    [moves.length]
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(i + 1, moves.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentIndex(-1);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentIndex(moves.length - 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [moves.length, onClose]);

  const currentFen =
    currentIndex === -1
      ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
      : moves[currentIndex].fen;

  // Build highlighted squares for last move using verbose history
  const highlightSquares: Record<string, React.CSSProperties> = {};
  if (currentIndex >= 0 && pgn) {
    try {
      const replay = new Chess();
      replay.loadPgn(pgn);
      const history = replay.history({ verbose: true });
      const mv = history[currentIndex];
      if (mv) {
        highlightSquares[mv.from] = { backgroundColor: "rgba(255, 214, 10, 0.4)" };
        highlightSquares[mv.to] = { backgroundColor: "rgba(255, 214, 10, 0.55)" };
      }
    } catch {
      // ignore
    }
  }

  const dateStr = game.date_played
    ? new Date(game.date_played).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal */}
      <div className="relative flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90dvh] sm:max-w-5xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-900 truncate">
                {game.opponent_name}
                {game.opponent_rating && (
                  <span className="ml-1 text-sm font-normal text-gray-400">
                    ({game.opponent_rating})
                  </span>
                )}
              </span>
              <ColorBadge color={game.color_played} />
              <ResultBadge result={game.result} />
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
              {dateStr && <span>{dateStr}</span>}
              {game.event && <span className="truncate">{game.event}{game.round ? ` · R${game.round}` : ""}</span>}
              {game.opening_name && <span className="truncate text-brand-600">{game.opening_name}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Board */}
          <div className="flex shrink-0 items-center justify-center bg-gray-50 p-3 sm:p-5">
            <div className="w-full max-w-[min(45vw,420px)] sm:w-[min(45vw,420px)]" style={{ minWidth: 220 }}>
              {loading ? (
                <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-200" />
              ) : (
                <Chessboard
                  options={{
                    position: currentFen,
                    boardOrientation: game.color_played === "black" ? "black" : "white",
                    allowDragging: false,
                    squareStyles: highlightSquares,
                    boardStyle: {
                      borderRadius: "8px",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                    },
                    darkSquareStyle: { backgroundColor: "#4a7c59" },
                    lightSquareStyle: { backgroundColor: "#f0d9b5" },
                    animationDurationInMs: 150,
                  }}
                />
              )}
            </div>
          </div>

          {/* Move list + controls */}
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Move list */}
            <div
              ref={moveListRef}
              className="min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-4"
            >
              {loading && (
                <div className="space-y-2 pt-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-4 animate-pulse rounded bg-gray-100" />
                  ))}
                </div>
              )}
              {error && (
                <div className="flex h-full items-center justify-center text-sm text-red-500">
                  {error}
                </div>
              )}
              {!loading && !error && moves.length === 0 && (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  No moves available
                </div>
              )}
              {!loading && moves.length > 0 && (
                <div className="flex flex-wrap gap-x-1 gap-y-0.5 py-1 text-sm font-mono leading-relaxed">
                  {moves.map((mv, idx) => (
                    <span key={idx} className="inline-flex items-baseline">
                      {mv.color === "w" && (
                        <span className="mr-0.5 select-none text-gray-400">
                          {mv.moveNumber}.
                        </span>
                      )}
                      <button
                        ref={idx === currentIndex ? activeMoveRef : null}
                        onClick={() => goTo(idx)}
                        className={`rounded px-1 py-0.5 transition-colors ${
                          idx === currentIndex
                            ? "bg-brand-600 text-white"
                            : "text-gray-800 hover:bg-gray-100"
                        }`}
                      >
                        {mv.san}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* PGN actions */}
            {pgn && (
              <div className="shrink-0 flex items-center justify-end gap-2 border-t border-gray-100 px-3 py-2 sm:px-4">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PGN
                </button>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  {copied ? (
                    <>
                      <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share PGN
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Navigation controls */}
            <div className="shrink-0 border-t border-gray-100 px-3 py-3 sm:px-4">
              <div className="flex items-center justify-center gap-2">
                <NavBtn
                  label="Start"
                  disabled={currentIndex === -1}
                  onClick={() => goTo(-1)}
                  icon={
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                    </svg>
                  }
                />
                <NavBtn
                  label="Previous"
                  disabled={currentIndex === -1}
                  onClick={() => goTo(currentIndex - 1)}
                  icon={
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                />
                <span className="min-w-[4rem] text-center text-xs tabular-nums text-gray-500">
                  {currentIndex === -1
                    ? "Start"
                    : `${moves[currentIndex]?.moveNumber ?? ""}${moves[currentIndex]?.color === "w" ? "." : "..."}`}
                </span>
                <NavBtn
                  label="Next"
                  disabled={currentIndex === moves.length - 1}
                  onClick={() => goTo(currentIndex + 1)}
                  icon={
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  }
                />
                <NavBtn
                  label="End"
                  disabled={currentIndex === moves.length - 1}
                  onClick={() => goTo(moves.length - 1)}
                  icon={
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z" />
                    </svg>
                  }
                />
              </div>
              <p className="mt-1.5 text-center text-[10px] text-gray-400">
                ← → arrow keys to navigate
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavBtn({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {icon}
    </button>
  );
}
