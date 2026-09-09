"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { usePuzzleSolve } from "@/lib/chess/puzzleSolve";
import type { Puzzle } from "@/types";

/**
 * The daily puzzle: one position, and the move that wins it.
 *
 * Play your move on the board. The opponent answers, and you play the next
 * one — usually two or three in all. A wrong move ends it, which is what makes
 * getting it right mean anything.
 *
 * Nothing is checked here. Each move goes to the server and comes back marked,
 * because the line is the whole point and a client that could check its own
 * moves would have been handed it.
 */

/** Lichess's theme tags are camelCase; nobody wants to read "mateIn2". */
function prettyTheme(tag: string): string {
  const spaced = tag.replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function PuzzleBoard({ puzzle, onChanged }: { puzzle: Puzzle; onChanged: (p: Puzzle) => void }) {
  const solve = usePuzzleSolve(puzzle, api.playPuzzleMove, onChanged);
  const [selected, setSelected] = useState<string | null>(null);

  const playing = solve.status === "playing";

  const handleSquareClick = useCallback(
    (square: string) => {
      if (!playing) return;
      if (selected === square) return setSelected(null);
      if (selected && solve.play(selected, square)) return setSelected(null);
      setSelected(solve.legalTargets(square).length > 0 ? square : null);
    },
    [selected, solve, playing]
  );

  const handleDrop = useCallback(
    (from: string, to: string) => {
      if (!playing) return false;
      setSelected(null);
      return solve.play(from, to);
    },
    [solve, playing]
  );

  const squareStyles = useMemo(() => {
    const targets = selected ? solve.legalTargets(selected) : [];
    return {
      // The last move, either side's, so the opponent's answer is not
      // something you have to spot by comparing two screenshots.
      ...(solve.lastMove
        ? {
            [solve.lastMove.from]: { backgroundColor: "rgba(246,195,68,0.35)" },
            [solve.lastMove.to]: { backgroundColor: "rgba(246,195,68,0.45)" },
          }
        : {}),
      ...(solve.wrongMove
        ? {
            [solve.wrongMove.from]: { backgroundColor: "rgba(220,38,38,0.35)" },
            [solve.wrongMove.to]: { backgroundColor: "rgba(220,38,38,0.5)" },
          }
        : {}),
      ...(selected ? { [selected]: { backgroundColor: "rgba(246,195,68,0.8)" } } : {}),
      ...Object.fromEntries(
        targets.map((sq) => [
          sq,
          { background: "radial-gradient(circle, rgba(20,20,20,0.30) 22%, transparent 24%)" },
        ])
      ),
    };
  }, [selected, solve.lastMove, solve.wrongMove, solve.legalTargets, solve]);

  const side = puzzle.side_to_move === "white" ? "White" : "Black";
  const count = puzzle.moves_to_find === 1 ? "the move" : `${puzzle.moves_to_find} moves`;

  const status =
    solve.status === "solved"
      ? { text: "Solved", tone: "text-brand-600 dark:text-brand-400" }
      : solve.status === "failed"
        ? { text: "Not the move", tone: "text-red-600 dark:text-red-400" }
        : solve.found > 0
          ? { text: "Right — keep going", tone: "text-brand-600 dark:text-brand-400" }
          : { text: `${side} to play · find ${count}`, tone: "text-gray-900 dark:text-gray-100" };

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      {/* Bounded by height as well as width, because the board is square and a
          wide monitor would otherwise make it taller than the page. */}
      <div className="w-full lg:w-[min(46vw,calc(100dvh-260px))]">
        <Chessboard
          options={{
            position: solve.fen,
            // Your pieces at the bottom. Solving a tactic from the other side
            // of the board is a different and much worse puzzle.
            boardOrientation: puzzle.side_to_move,
            allowDragging: playing,
            onPieceDrop: ({ sourceSquare, targetSquare }) =>
              targetSquare ? handleDrop(sourceSquare, targetSquare) : false,
            onSquareClick: ({ square }) => handleSquareClick(square),
            squareStyles,
            arrows: [],
            boardStyle: { borderRadius: "8px" },
            darkSquareStyle: { backgroundColor: "#4a7c59" },
            lightSquareStyle: { backgroundColor: "#f0d9b5" },
            animationDurationInMs: 150,
          }}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-border dark:bg-dark-surface">
          <p className={`text-base font-extrabold ${status.tone}`}>{status.text}</p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Move {puzzle.move_number}
            {puzzle.rating ? ` · rated ${puzzle.rating}` : ""}
            {playing && puzzle.moves_to_find > 1
              ? ` · ${solve.found}/${puzzle.moves_to_find} found`
              : ""}
          </p>
          {solve.status === "checking" && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Checking…</p>
          )}
        </div>

        {puzzle.finished && (
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-border dark:bg-dark-surface">
            {/* Only now: before this, these are the answer. */}
            {solve.solutionSan.length > 0 && (
              <div>
                <p className="text-[11px] font-bold tracking-wide text-gray-400 dark:text-gray-500">
                  THE LINE
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
                  {solve.solutionSan.join("  ")}
                </p>
              </div>
            )}
            {puzzle.themes.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {puzzle.themes.slice(0, 5).map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-500 dark:border-dark-border dark:text-gray-400"
                  >
                    {prettyTheme(tag)}
                  </li>
                ))}
              </ul>
            )}
            {!!puzzle.game_url && (
              <a
                href={puzzle.game_url}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                See the game →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GamesPage() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPuzzles()
      .then((body) => setPuzzles(body.puzzles))
      .catch((err) => setError(userMessage(err, "Couldn't load the puzzles.")))
      .finally(() => setLoading(false));
  }, []);

  // Replaces the one puzzle that changed rather than refetching: the server
  // has already returned its new state, and a refetch would go and ask for
  // what we were just told.
  const replace = useCallback(
    (next: Puzzle) => setPuzzles((prev) => prev.map((p) => (p.id === next.id ? next : p))),
    []
  );

  const current = puzzles[index];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Daily puzzle</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          One position, and the move that wins it. A new one each day.
        </p>
      </div>

      {puzzles.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {puzzles.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                i === index
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-gray-300 text-gray-600 hover:border-brand-400 dark:border-dark-border dark:text-gray-300"
              }`}
            >
              {new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              {p.solved ? " ✓" : p.failed ? " ✕" : ""}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : !current ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center dark:border-dark-border">
          <p className="font-semibold text-gray-900 dark:text-gray-100">No puzzle yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            A new position is set each day. Check back shortly.
          </p>
        </div>
      ) : (
        /* Keyed on the puzzle: switching days is a new board, and carrying the
           old one's move state across would be a bug hunt later. */
        <PuzzleBoard key={current.id} puzzle={current} onChanged={replace} />
      )}
    </div>
  );
}
