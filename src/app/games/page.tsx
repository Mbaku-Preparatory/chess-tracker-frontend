"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { usePuzzleEntry } from "@/lib/chess/puzzleEntry";
import type { Puzzle, PuzzleVerdict } from "@/types";

/**
 * The daily puzzle: guess the five moves actually played from a real position.
 *
 * Moves are played on the board rather than typed. It is chess and the board
 * is right there, and typing SAN would make the game partly a spelling test.
 *
 * Nothing is scored here. The attempt goes to the server and comes back
 * marked — the solution is the whole game, so a client that could mark it
 * would have been given it.
 */

const VERDICT_CLASS: Record<PuzzleVerdict, string> = {
  correct: "bg-[#4a7c59] text-white border-transparent",
  misplaced: "bg-[#c9a227] text-white border-transparent",
  piece: "bg-[#3f6fa8] text-white border-transparent",
  wrong: "bg-gray-500 text-white border-transparent",
};

const LEGEND: { verdict: PuzzleVerdict; label: string }[] = [
  { verdict: "correct", label: "Right move, right place" },
  { verdict: "misplaced", label: "In the line, wrong place" },
  { verdict: "piece", label: "Right piece, wrong move" },
  { verdict: "wrong", label: "Not in the line" },
];

function Tile({ san, verdict }: { san: string | null; verdict?: PuzzleVerdict }) {
  return (
    <div
      className={`flex h-9 items-center justify-center truncate rounded-md border px-1 font-mono text-xs font-bold ${
        verdict
          ? VERDICT_CLASS[verdict]
          : "border-gray-300 bg-white text-gray-800 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100"
      }`}
    >
      {san ?? ""}
    </div>
  );
}

function PuzzleBoard({ puzzle, onScored }: { puzzle: Puzzle; onScored: (p: Puzzle) => void }) {
  const entry = usePuzzleEntry(puzzle.fen, puzzle.solution_length);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSquareClick = useCallback(
    (square: string) => {
      if (puzzle.finished) return;
      if (selected === square) return setSelected(null);
      if (selected && entry.play(selected, square)) return setSelected(null);
      setSelected(entry.legalTargets(square).length > 0 ? square : null);
    },
    [selected, entry, puzzle.finished]
  );

  const handleDrop = useCallback(
    (from: string, to: string) => {
      if (puzzle.finished) return false;
      setSelected(null);
      return entry.play(from, to);
    },
    [entry, puzzle.finished]
  );

  const targetStyles = useMemo(() => {
    const squares = selected ? entry.legalTargets(selected) : [];
    return Object.fromEntries(
      squares.map((sq) => [
        sq,
        { background: "radial-gradient(circle, rgba(20,20,20,0.30) 22%, transparent 24%)" },
      ])
    );
  }, [selected, entry]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const next = await api.guessPuzzle(puzzle.id, entry.moves);
      entry.clear();
      setSelected(null);
      onScored(next);
    } catch (err) {
      setError(userMessage(err, "Couldn't submit that guess."));
    } finally {
      setSubmitting(false);
    }
  }

  const rows = Array.from({ length: puzzle.max_attempts }, (_, row) => {
    if (row < puzzle.guesses.length) {
      return { moves: puzzle.guesses[row], verdicts: puzzle.results[row] as PuzzleVerdict[] | null };
    }
    if (row === puzzle.guesses.length && !puzzle.finished) {
      return { moves: entry.moves, verdicts: null };
    }
    return { moves: [] as string[], verdicts: null };
  });

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      {/* Board sized against the viewport, and bounded by height because it is
          square — otherwise a wide monitor makes it taller than the page. */}
      <div className="w-full lg:w-[min(46vw,calc(100dvh-260px))]">
        <Chessboard
          options={{
            position: entry.fen || puzzle.fen,
            boardOrientation: puzzle.side_to_move,
            allowDragging: !puzzle.finished,
            onPieceDrop: ({ sourceSquare, targetSquare }) =>
              targetSquare ? handleDrop(sourceSquare, targetSquare) : false,
            onSquareClick: ({ square }) => handleSquareClick(square),
            squareStyles: {
              ...(selected ? { [selected]: { backgroundColor: "rgba(246,195,68,0.8)" } } : {}),
              ...targetStyles,
            },
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
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {puzzle.side_to_move === "white" ? "White" : "Black"} to play, move {puzzle.move_number}
          </p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {puzzle.white} vs {puzzle.black}
            {puzzle.year ? ` · ${puzzle.year}` : ""}
            {puzzle.event ? ` · ${puzzle.event}` : ""}
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Play the {puzzle.solution_length} moves you think came next.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${puzzle.solution_length}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: puzzle.solution_length }, (_, col) => (
                <Tile key={col} san={row.moves[col] ?? null} verdict={row.verdicts?.[col]} />
              ))}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {!puzzle.finished ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={entry.undo}
              disabled={entry.moves.length === 0}
              className="btn-secondary disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!entry.complete || submitting}
              className="btn-primary disabled:opacity-50"
            >
              {submitting
                ? "Checking…"
                : `Submit (${puzzle.max_attempts - puzzle.attempts_used} left)`}
            </button>
          </div>
        ) : (
          <div
            className={`rounded-xl border p-4 ${
              puzzle.solved
                ? "border-brand-600 text-brand-700 dark:text-brand-400"
                : "border-gray-200 text-gray-900 dark:border-dark-border dark:text-gray-100"
            }`}
          >
            <p className="text-sm font-extrabold">
              {puzzle.solved ? "Solved" : "Out of guesses"}
            </p>
            {puzzle.solution && (
              <p className="mt-1 font-mono text-sm text-gray-500 dark:text-gray-400">
                {puzzle.solution.join("  ")}
              </p>
            )}
          </div>
        )}

        <ul className="flex flex-col gap-1">
          {LEGEND.map(({ verdict, label }) => (
            <li key={verdict} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className={`h-3 w-3 rounded-sm ${VERDICT_CLASS[verdict].split(" ")[0]}`} />
              {label}
            </li>
          ))}
        </ul>
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
          Guess the moves actually played. A new position each day.
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
              {p.solved ? " ✓" : ""}
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
        <PuzzleBoard puzzle={current} onScored={replace} />
      )}
    </div>
  );
}
