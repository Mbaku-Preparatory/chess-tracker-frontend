"use client";

import { Chessboard } from "react-chessboard";

/** The board alone, so the analysis page can load it in the browser only:
 * the page's text (players, event, moves) still renders on the server. */
export default function Board({
  fen,
  orientation,
  squareStyles,
  onDrop,
  onSquareClick,
}: {
  fen: string;
  orientation: "white" | "black";
  squareStyles: Record<string, React.CSSProperties>;
  onDrop: (from: string, to: string) => boolean;
  onSquareClick: (square: string) => void;
}) {
  return (
    <Chessboard
      options={{
        position: fen,
        boardOrientation: orientation,
        // Play your own moves; the game is untouched, and a move that leaves
        // it opens a branch instead.
        allowDragging: true,
        onPieceDrop: ({ sourceSquare, targetSquare }) => (targetSquare ? onDrop(sourceSquare, targetSquare) : false),
        onSquareClick: ({ square }) => onSquareClick(square),
        squareStyles,
        // No arrow for the engine's move: an arrow reads as something that
        // happened in the game. Its squares are tinted instead.
        arrows: [],
        boardStyle: { borderRadius: "8px", boxShadow: "0 4px 24px rgba(0,0,0,0.12)" },
        darkSquareStyle: { backgroundColor: "#4a7c59" },
        lightSquareStyle: { backgroundColor: "#f0d9b5" },
        animationDurationInMs: 150,
      }}
    />
  );
}
