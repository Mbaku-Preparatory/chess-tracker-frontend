"use client";

import { Chess, type Move } from "chess.js";
import { useEffect, useMemo, useState } from "react";
import { Chessboard, defaultPieces } from "react-chessboard";

type Promotion = "q" | "r" | "b" | "n";
const PROMOTIONS: { piece: Promotion; name: string }[] = [
  { piece: "q", name: "Queen" },
  { piece: "n", name: "Knight" },
  { piece: "r", name: "Rook" },
  { piece: "b", name: "Bishop" },
];

// What touching a piece shows: the piece, a dot on each square it can move
// to, a ring where it would capture, and the square under the pointer when
// that is one of them (chess.com and Lichess both do this).
const SELECTED = { backgroundColor: "rgba(246,195,68,0.8)" };
const DOT = { background: "radial-gradient(circle, rgba(20,20,20,0.30) 22%, transparent 24%)" };
const RING = { background: "radial-gradient(circle closest-side, transparent 80%, rgba(20,20,20,0.30) 82%, rgba(20,20,20,0.30) 99%, transparent 100%)" };
// The square under the pointer: red where the piece would capture, yellow
// where it would only move.
const HOVER_CAPTURE = { backgroundColor: "rgba(220,38,38,0.55)", boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.85)" };
const HOVER_MOVE = { backgroundColor: "rgba(246,195,68,0.5)", boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.85)" };

function legalMoves(fen: string): Move[] {
  try {
    return new Chess(fen).moves({ verbose: true });
  } catch {
    // A diagram that is not a legal position: nothing to play, never a crash.
    return [];
  }
}

/**
 * The one chessboard. Everything about moving a piece lives here: tap or drag,
 * the hints, and asking which piece a pawn becomes. Pages only say what a move
 * means (`onMove`), and add their own tints (`highlights`: the last move, the
 * engine's choice).
 *
 * Without `onMove` the board is for looking only. `side` limits it to one
 * colour's pieces (the bot's opponent).
 */
export default function Board({
  fen,
  orientation,
  highlights,
  onMove,
  side,
  rounded = "8px",
}: {
  fen: string;
  orientation: "white" | "black";
  highlights?: Record<string, React.CSSProperties>;
  onMove?: (from: string, to: string, promotion?: Promotion) => boolean;
  side?: "w" | "b";
  rounded?: string;
}) {
  const moves = useMemo(() => (onMove ? legalMoves(fen) : []), [fen, onMove]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<{ from: string; to: string; color: "w" | "b" } | null>(null);

  // A new position starts with nothing picked up.
  useEffect(() => {
    setSelected(null);
    setPromoting(null);
  }, [fen]);

  useEffect(() => {
    if (!promoting) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPromoting(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [promoting]);

  const movableFrom = (square: string) => moves.some((m) => m.from === square && (!side || m.color === side));

  /** A move by the person: played, or the promotion picker opened first. */
  function attempt(from: string, to: string): boolean {
    const candidates = moves.filter((m) => m.from === from && m.to === to && (!side || m.color === side));
    if (!onMove || candidates.length === 0) return false;
    if (candidates[0].promotion) {
      setPromoting({ from, to, color: candidates[0].color });
      return false; // the pawn goes back until a piece is chosen
    }
    return onMove(from, to);
  }

  function onSquareClick(square: string) {
    if (promoting) return;
    if (selected && selected !== square && moves.some((m) => m.from === selected && m.to === square)) {
      attempt(selected, square);
      return setSelected(null);
    }
    setSelected(selected !== square && movableFrom(square) ? square : null);
  }

  const active = dragFrom ?? selected;
  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = { ...highlights };
    if (!active) return styles;
    styles[active] = SELECTED;
    for (const m of moves) {
      if (m.from !== active) continue;
      styles[m.to] = m.to === hover ? (m.captured ? HOVER_CAPTURE : HOVER_MOVE) : m.captured ? RING : DOT;
    }
    return styles;
  }, [highlights, active, moves, hover]);

  // The picker covers the promotion file from the edge the pawn reached.
  const pick = promoting && {
    column: orientation === "white" ? promoting.to.charCodeAt(0) - 97 : 104 - promoting.to.charCodeAt(0),
    atTop: (promoting.to[1] === "8") === (orientation === "white"),
  };

  return (
    <div className="relative">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: Boolean(onMove) && !promoting,
          canDragPiece: ({ square }) => square !== null && movableFrom(square),
          onPieceDrag: ({ square }) => {
            setSelected(null);
            setDragFrom(square);
          },
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            setDragFrom(null);
            return targetSquare ? attempt(sourceSquare, targetSquare) : false;
          },
          onSquareClick: ({ square }) => onSquareClick(square),
          onMouseOverSquare: ({ square }) => setHover(square),
          onMouseOutSquare: ({ square }) => setHover((h) => (h === square ? null : h)),
          squareStyles,
          // Our own hover style instead, and only on squares the piece can reach.
          dropSquareStyle: {},
          // No arrow for the engine's move: an arrow reads as something that
          // happened in the game. Its squares are tinted instead.
          arrows: [],
          boardStyle: { borderRadius: rounded, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" },
          darkSquareStyle: { backgroundColor: "#4a7c59" },
          lightSquareStyle: { backgroundColor: "#f0d9b5" },
          animationDurationInMs: 150,
        }}
      />
      {promoting && pick && (
        <div
          className="absolute inset-0 z-10 bg-black/30"
          style={{ borderRadius: rounded }}
          onClick={() => setPromoting(null)}
          role="dialog"
          aria-label="Promote the pawn to"
        >
          <div
            className={`absolute flex w-[12.5%] overflow-hidden bg-white shadow-xl ${pick.atTop ? "top-0 flex-col" : "bottom-0 flex-col-reverse"}`}
            style={{ left: `${pick.column * 12.5}%` }}
          >
            {PROMOTIONS.map(({ piece, name }) => (
              <button
                key={piece}
                type="button"
                aria-label={name}
                title={name}
                className="aspect-square w-full p-[6%] hover:bg-amber-200"
                onClick={(e) => {
                  e.stopPropagation();
                  setPromoting(null);
                  onMove?.(promoting.from, promoting.to, piece);
                }}
              >
                {defaultPieces[`${promoting.color}${piece.toUpperCase()}`]({ svgStyle: { width: "100%", height: "100%" } })}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
