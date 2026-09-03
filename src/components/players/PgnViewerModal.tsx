"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { Game } from "@/types";
import { api } from "@/lib/api";
import { gameRef } from "@/lib/gameRef";
import { ColorBadge, ResultBadge } from "@/components/ui/Badge";
import { EvalBar } from "@/components/ui/EvalBar";
import { useStockfish, parseUciMove } from "@/hooks/useStockfish";

function pgnFilename(game: Game): string {
  const opp = game.opponent_name.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");
  const date = game.date_played ? game.date_played.replace(/-/g, "") : "unknown";
  return `${opp}_${date}_${game.result}.pgn`;
}

// ── Share sheet ───────────────────────────────────────────────────────────────

interface ShareOption {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  bg: string;
}

function ShareSheet({
  pgn,
  game,
  onClose,
}: {
  pgn: string;
  game: Game;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(pgn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const title = `${game.opponent_name} (${game.result}) — ${game.date_played ?? ""}`;
  const encoded = encodeURIComponent(pgn.slice(0, 1500)); // stay within URL limits

  const platforms: ShareOption[] = [
    {
      label: "Copy",
      bg: "bg-gray-700",
      icon: copied ? (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      action: copyToClipboard,
    },
    {
      label: "WhatsApp",
      bg: "bg-[#25D366]",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      action: () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Chess game PGN:\n\n${pgn.slice(0, 1500)}`)}`, "_blank", "noopener"),
    },
    {
      label: "Telegram",
      bg: "bg-[#229ED9]",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      action: () => window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(`Chess game PGN:\n\n${pgn.slice(0, 1500)}`)}`, "_blank", "noopener"),
    },
    {
      label: "X / Twitter",
      bg: "bg-black",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Chess game vs ${game.opponent_name} (${game.result})\n\n${pgn.slice(0, 200)}…`)}`, "_blank", "noopener"),
    },
    {
      label: "Email",
      bg: "bg-gray-500",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      action: () => window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encoded}`, "_self"),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white dark:bg-dark-surface px-5 pb-8 pt-5 shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Share PGN</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-muted hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Platform icons row */}
        <div className="mb-5 flex items-start gap-5 overflow-x-auto pb-1">
          {platforms.map((p) => (
            <button
              key={p.label}
              onClick={p.action}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${p.bg}`}>
                {p.icon}
              </span>
              <span className="text-[11px] text-gray-600 dark:text-gray-400">
                {p.label === "Copy" && copied ? "Copied!" : p.label}
              </span>
            </button>
          ))}
        </div>

        <hr className="mb-4 border-gray-100" />

        {/* PGN text + copy */}
        <div className="flex items-stretch gap-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-elevated px-3 py-2">
          <textarea
            ref={textRef}
            readOnly
            value={pgn}
            rows={2}
            className="min-w-0 flex-1 resize-none bg-transparent font-mono text-[11px] text-gray-500 dark:text-gray-400 focus:outline-none"
            onClick={() => textRef.current?.select()}
          />
          <button
            onClick={copyToClipboard}
            className="shrink-0 self-center rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
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

// ── Who is sitting on each side of the board ──────────────────────────────────

interface SidePlayer {
  name: string;
  rating: string | null;
  /** "1", "0" or "½" — this side's score. null when the game has no result. */
  score: string | null;
}

/**
 * Each side's score, preferring the PGN's Result tag.
 *
 * The tag is authoritative because it is written from the board's point of
 * view and names both sides. `game.result` is stored relative to the player
 * being scouted, so using it means knowing which colour they had — fine as a
 * fallback, wrong to prefer when the PGN says it outright.
 */
function sideScores(
  resultTag: string | null,
  gameResult: string,
  playerColor: "white" | "black",
): Record<"white" | "black", string | null> {
  switch (resultTag) {
    case "1-0":
      return { white: "1", black: "0" };
    case "0-1":
      return { white: "0", black: "1" };
    case "1/2-1/2":
      return { white: "½", black: "½" };
  }

  const other = playerColor === "white" ? "black" : "white";
  const map: Record<string, [string, string]> = {
    win: ["1", "0"],
    loss: ["0", "1"],
    draw: ["½", "½"],
  };
  const pair = map[gameResult];
  if (!pair) return { white: null, black: null };
  return { [playerColor]: pair[0], [other]: pair[1] } as Record<"white" | "black", string | null>;
}

/**
 * Names for both sides, keyed by colour rather than by "us"/"them" — the plates
 * are placed by board orientation, so the caller only ever asks for a colour.
 *
 * The PGN's tag roster is the real source: it names both players, which the
 * `Game` record cannot (it only stores the opponent). Imports without those
 * tags fall back to the record for the opponent and to the colour word for the
 * scouted player, which is honest rather than guessing at a name.
 */
function boardPlayers(pgn: string | null, game: Game): Record<"white" | "black", SidePlayer> {
  let headers: Record<string, string> = {};
  if (pgn) {
    try {
      const chess = new Chess();
      chess.loadPgn(pgn);
      headers = chess.getHeaders();
    } catch {
      // Unparseable PGN — the fallbacks below still produce usable plates.
    }
  }

  const playerColor = game.color_played === "black" ? "black" : "white";
  // PGN writers use "?" for an unknown tag, which is worse than no tag at all.
  const tag = (key: string) => {
    const value = headers[key]?.trim();
    return value && value !== "?" ? value : null;
  };

  const scores = sideScores(tag("Result"), game.result, playerColor);

  const build = (color: "white" | "black"): SidePlayer => {
    const prefix = color === "white" ? "White" : "Black";
    const isOpponent = color !== playerColor;
    return {
      name:
        tag(prefix) ??
        (isOpponent ? game.opponent_name : prefix),
      rating:
        tag(`${prefix}Elo`) ??
        (isOpponent && game.opponent_rating ? String(game.opponent_rating) : null),
      score: scores[color],
    };
  };

  return { white: build("white"), black: build("black") };
}

/**
 * One name plate. Sized to the board it sits against, so long names truncate
 * instead of widening the column on a narrow phone.
 */
function PlayerPlate({ player, color }: { player: SidePlayer; color: "white" | "black" }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 px-0.5">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full border ${
          // Semantic, not decorative: this dot *is* the piece colour, so it
          // stays white-on-dark and dark-on-light in both themes.
          color === "white"
            ? "border-gray-300 bg-white dark:border-gray-500"
            : "border-gray-600 bg-gray-800 dark:border-gray-500 dark:bg-black"
        }`}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-900 dark:text-gray-100 sm:text-sm">
        {player.name}
      </span>
      {player.score && (
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-dark-elevated sm:text-xs"
          title="Final score"
        >
          {player.score}
        </span>
      )}
      {player.rating && (
        <span className="shrink-0 text-[11px] font-normal tabular-nums text-gray-400 dark:text-gray-500 sm:text-xs">
          {player.rating}
        </span>
      )}
    </div>
  );
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
  const [showShare, setShowShare] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState<"lichess" | null>(null);
  const moveListRef = useRef<HTMLDivElement>(null);
  const activeMoveRef = useRef<HTMLButtonElement>(null);

  // The board is drawn from the scouted player's side, so that colour is the
  // one on the bottom plate and its opponent goes on top.
  const orientation: "white" | "black" = game.color_played === "black" ? "black" : "white";
  const players = useMemo(() => boardPlayers(pgn, game), [pgn, game]);

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

  async function handleAnalysis(platform: "chesscom" | "lichess") {
    if (!pgn) return;
    if (platform === "chesscom") {
      window.open(`https://www.chess.com/analysis?pgn=${encodeURIComponent(pgn)}`, "_blank", "noopener");
      return;
    }
    setAnalysisLoading("lichess");
    try {
      const data = await api.lichessImportProxy(pgn);
      window.open(data.url, "_blank", "noopener");
    } catch {
      // silent — user can retry
    } finally {
      setAnalysisLoading(null);
    }
  }

  // Fetch PGN on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getGamePgn(gameRef(game))
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

  // Stockfish analysis
  const engine = useStockfish(currentFen, !loading && !error);
  const bestMoveSquares = parseUciMove(engine.bestMove);

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
    <>
    {showShare && pgn && (
      <ShareSheet pgn={pgn} game={game} onClose={() => setShowShare(false)} />
    )}
    {/* Backdrop */}
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal */}
      <div className="relative flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white dark:bg-dark-surface shadow-2xl sm:max-h-[90dvh] sm:max-w-5xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {game.opponent_name}
                {game.opponent_rating && (
                  <span className="ml-1 text-sm font-normal text-gray-400 dark:text-gray-500">
                    ({game.opponent_rating})
                  </span>
                )}
              </span>
              <ColorBadge color={game.color_played} />
              <ResultBadge result={game.result} />
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
              {dateStr && <span>{dateStr}</span>}
              {game.event && <span className="truncate">{game.event}{game.round ? ` · R${game.round}` : ""}</span>}
              {game.opening_name && <span className="truncate text-brand-600">{game.opening_name}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-dark-muted hover:text-gray-700"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Board + eval bar */}
          <div className="flex shrink-0 items-center justify-center gap-2 bg-gray-50 dark:bg-dark-elevated p-3 sm:p-5">
            <EvalBar
              score={engine.score}
              mate={engine.mate}
              depth={engine.depth}
              isAnalyzing={engine.isAnalyzing}
              source={engine.source}
            />
            {/* 45vw is a side-by-side desktop measure; below `sm` the modal
                stacks, so the board takes the width the phone actually has. */}
            <div
              className="flex w-full max-w-[min(86vw,420px)] flex-col gap-1.5 sm:w-[min(45vw,420px)] sm:max-w-[min(45vw,420px)]"
              style={{ minWidth: 220 }}
            >
              <PlayerPlate
                player={players[orientation === "white" ? "black" : "white"]}
                color={orientation === "white" ? "black" : "white"}
              />
              {loading ? (
                <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-200" />
              ) : (
                <Chessboard
                  options={{
                    position: currentFen,
                    boardOrientation: orientation,
                    allowDragging: false,
                    squareStyles: {
                      ...highlightSquares,
                      ...(bestMoveSquares
                        ? {
                            [bestMoveSquares[0]]: { backgroundColor: "rgba(0,200,80,0.35)" },
                            [bestMoveSquares[1]]: { backgroundColor: "rgba(0,200,80,0.55)" },
                          }
                        : {}),
                    },
                    // The engine's suggested move is not drawn. An arrow on
                    // the board reads as something that happened in the game
                    // rather than a suggestion, which is confusing next to the
                    // yellow last-move highlight. The engine still drives the
                    // eval bar. Restore by passing bestMoveSquares here.
                    arrows: [],
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
              <PlayerPlate player={players[orientation]} color={orientation} />
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
                    <div key={i} className="h-4 animate-pulse rounded bg-gray-100 dark:bg-dark-elevated" />
                  ))}
                </div>
              )}
              {error && (
                <div className="flex h-full items-center justify-center text-sm text-red-500">
                  {error}
                </div>
              )}
              {!loading && !error && moves.length === 0 && (
                <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                  No moves available
                </div>
              )}
              {!loading && moves.length > 0 && (
                <div className="flex flex-wrap gap-x-1 gap-y-0.5 py-1 text-sm font-mono leading-relaxed">
                  {moves.map((mv, idx) => (
                    <span key={idx} className="inline-flex items-baseline">
                      {mv.color === "w" && (
                        <span className="mr-0.5 select-none text-gray-400 dark:text-gray-500">
                          {mv.moveNumber}.
                        </span>
                      )}
                      <button
                        ref={idx === currentIndex ? activeMoveRef : null}
                        onClick={() => goTo(idx)}
                        className={`rounded px-1 py-0.5 transition-colors ${
                          idx === currentIndex
                            ? "bg-brand-600 text-white"
                            : "text-gray-800 hover:bg-gray-100 dark:hover:bg-dark-muted"
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
                {/* Download — icon only */}
                <button
                  onClick={handleDownload}
                  aria-label="Download PGN"
                  title="Download PGN"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-dark-elevated dark:hover:border-dark-muted dark:hover:bg-dark-elevated"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>

                {/* Chess.com analysis */}
                <button
                  onClick={() => handleAnalysis("chesscom")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-dark-border px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 transition-colors hover:border-[#7fa650]/40 hover:bg-[#7fa650]/5"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-[#7fa650]">
                    <path d="M10 2a1 1 0 00-1 1v1H8a3 3 0 00-3 3v1H4a1 1 0 000 2h1v1a3 3 0 003 3h.17l-1.9 4.55A1 1 0 007.2 20h9.6a1 1 0 00.93-1.45L15.83 14H16a3 3 0 003-3v-1h1a1 1 0 000-2h-1V7a3 3 0 00-3-3h-1V3a1 1 0 00-1-1h-4z" />
                  </svg>
                  Chess.com
                </button>

                {/* Lichess analysis */}
                <button
                  onClick={() => handleAnalysis("lichess")}
                  disabled={analysisLoading === "lichess"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-dark-border px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 transition-colors hover:border-[#b05000]/40 hover:bg-[#b05000]/5 disabled:opacity-60"
                >
                  {analysisLoading === "lichess" ? (
                    <svg className="h-3.5 w-3.5 animate-spin text-[#b05000]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-[#b05000]">
                      <path d="M19 22H5v-2h14v2M13 2a3 3 0 00-3 3c0 .88.39 1.67 1 2.22V8l-3 1-2 4h2v1H6l-1 3h14l-1-3h-2v-1h2l-2-4-3-1V7.22c.61-.55 1-1.34 1-2.22a3 3 0 00-1-2.24V2h-1z" />
                    </svg>
                  )}
                  {analysisLoading === "lichess" ? "Opening…" : "Lichess"}
                </button>

                {/* Share */}
                <button
                  onClick={() => setShowShare(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-dark-border px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-dark-elevated dark:hover:border-dark-muted dark:hover:bg-dark-elevated"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
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
                <span className="min-w-[4rem] text-center text-xs tabular-nums text-gray-500 dark:text-gray-400">
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
              <p className="mt-1.5 text-center text-[10px] text-gray-400 dark:text-gray-500">
                ← → arrow keys to navigate
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
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
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-dark-elevated dark:hover:border-dark-muted dark:hover:bg-dark-elevated disabled:cursor-not-allowed disabled:opacity-30"
    >
      {icon}
    </button>
  );
}
