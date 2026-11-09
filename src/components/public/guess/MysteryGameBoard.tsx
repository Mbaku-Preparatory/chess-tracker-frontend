"use client";

import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import { MOVES_PER_GUESS, visiblePlies, type MysteryGame } from "@/lib/guessThePlayer";

const Board = dynamic(() => import("@/components/analysis/Board"), {
  ssr: false,
  loading: () => <div className="aspect-square w-full animate-pulse rounded-lg bg-ink-raised" />,
});

const START = new Chess().fen();
const LAST_FROM = { backgroundColor: "rgba(255, 214, 10, 0.4)" };
const LAST_TO = { backgroundColor: "rgba(255, 214, 10, 0.55)" };

type Ply = { san: string; from: string; to: string; fen: string };

/** The game, one position per half-move. Stops at a move that does not play rather than crash the page. */
function replay(moves: string): Ply[] {
  const chess = new Chess();
  const plies: Ply[] = [];
  for (const san of moves.split(" ").filter(Boolean)) {
    try {
      const m = chess.move(san);
      plies.push({ san: m.san, from: m.from, to: m.to, fen: chess.fen() });
    } catch {
      break;
    }
  }
  return plies;
}

const capital = (side: string) => side[0].toUpperCase() + side.slice(1);

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function StepButton({ label, onClick, disabled, path }: { label: string; onClick: () => void; disabled: boolean; path: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 flex-1 items-center justify-center rounded-lg bg-ink-raised text-ink-text hover:bg-ink-line disabled:cursor-default disabled:opacity-35 disabled:hover:bg-ink-raised"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d={path} />
      </svg>
    </button>
  );
}

const ICONS = {
  first: "M6 5h2v14H6zM9.5 12 18 5.5v13z",
  back: "M8 12 17 5.5v13z",
  forward: "M16 12 7 5.5v13z",
  last: "M16 5h2v14h-2zM14.5 12 6 18.5v-13z",
};

/**
 * "Their game": a game the mystery player won, as a clue next to the tiles.
 * The first ten moves are open from the start, ten more with each wrong
 * guess, the whole game after three; the names, the event and the link only
 * once the puzzle is over.
 */
export function MysteryGameBoard({ game, wrongGuesses, over }: { game: MysteryGame; wrongGuesses: number; over: boolean }) {
  const plies = useMemo(() => replay(game.moves), [game.moves]);
  const visible = visiblePlies(plies.length, wrongGuesses, over);
  const locked = visible < plies.length;

  // Start on the last open move: the position is the clue, not the empty board.
  const [at, setAt] = useState(visible);
  const shown = useRef(visible);
  useEffect(() => {
    // Newly opened moves: someone standing at the old end follows it to the new one.
    if (visible === shown.current) return;
    setAt((a) => (a === shown.current ? visible : Math.min(a, visible)));
    shown.current = visible;
  }, [visible]);

  const go = (ply: number) => setAt(Math.max(0, Math.min(visible, ply)));

  // Arrow keys step through the game, except while typing a guess.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      const to = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: visible }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      setAt(Math.max(0, Math.min(visible, to)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, visible]);

  // Keep the current move in sight inside the move list, without scrolling the page.
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>("[aria-current='step']");
    if (!list || !active) return;
    const top = active.offsetTop - list.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + active.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + active.offsetHeight - list.clientHeight;
  }, [at]);

  const ply = at > 0 ? plies[at - 1] : null;
  const highlights = ply ? { [ply.from]: LAST_FROM, [ply.to]: LAST_TO } : undefined;
  const fullMoves = Math.ceil(plies.length / 2);
  const nextOpens = visiblePlies(plies.length, wrongGuesses + 1, false);

  const rows: { n: number; white?: number; black?: number }[] = [];
  for (let i = 0; i < visible; i++) {
    const n = Math.floor(i / 2) + 1;
    if (i % 2 === 0) rows.push({ n, white: i + 1 });
    else rows[rows.length - 1].black = i + 1;
  }

  const moveButton = (p: number | undefined) =>
    p === undefined ? (
      <span />
    ) : (
      <button
        type="button"
        onClick={() => go(p)}
        aria-current={p === at ? "step" : undefined}
        className={`rounded px-1.5 py-0.5 text-left ${p === at ? "bg-accent text-accent-on" : "hover:bg-ink-raised"}`}
      >
        {plies[p - 1].san}
      </button>
    );

  return (
    <section aria-label="Their game" className="rounded-xl bg-ink-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[17px] font-[480]">{over ? "Their game" : "A game they won"}</h2>
        <p className="text-[14px] text-ink-muted">
          {over ? (
            <>
              {game.white} – {game.black} · {game.result}
            </>
          ) : (
            <>The mystery player has {capital(game.side)}</>
          )}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="mx-auto flex w-full max-w-[340px] flex-col gap-3">
          <Board fen={ply?.fen ?? START} orientation={game.side} highlights={highlights} rounded="8px" />
          <div className="flex gap-2">
            <StepButton label="Start" onClick={() => go(0)} disabled={at === 0} path={ICONS.first} />
            <StepButton label="Previous move" onClick={() => go(at - 1)} disabled={at === 0} path={ICONS.back} />
            <StepButton label="Next move" onClick={() => go(at + 1)} disabled={at >= visible} path={ICONS.forward} />
            <StepButton label="Last open move" onClick={() => go(visible)} disabled={at >= visible} path={ICONS.last} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-[14px] tabular-nums text-ink-muted" aria-live="polite">
            {at === 0 ? "Starting position" : `Move ${Math.ceil(at / 2)} of ${fullMoves}`}
          </p>
          {/* On a phone the moves wrap like a scoresheet line, so the guess box stays close; wider, one move per row. */}
          <ol
            ref={listRef}
            aria-label="Moves"
            className="relative flex max-h-[5.75rem] flex-wrap content-start gap-x-2 overflow-y-auto pr-1 text-[15px] tabular-nums sm:block sm:max-h-[260px]"
          >
            {rows.map((r) => (
              <li key={r.n} className="flex items-center gap-0.5 sm:grid sm:grid-cols-[2.25rem_1fr_1fr] sm:gap-1">
                <span className="text-ink-faint">{r.n}.</span>
                {moveButton(r.white)}
                {moveButton(r.black)}
              </li>
            ))}
            {!locked && <li className="px-1.5 py-0.5 text-ink-muted sm:mt-1 sm:pl-[2.5rem]">{game.result}</li>}
          </ol>
          {locked && (
            <p className="flex items-start gap-2 rounded-lg bg-ink-raised px-3 py-2 text-[14px] leading-[1.45] text-ink-muted">
              <LockIcon />
              <span>
                {nextOpens >= plies.length
                  ? "The rest of the game opens after your next guess."
                  : `The next ${MOVES_PER_GUESS} moves open after your next guess.`}
              </span>
            </p>
          )}
          <p className="mt-auto text-[12px] leading-[1.5] text-ink-faint">
            {over && (
              <>
                {game.event}
                {/^\d{4}/.test(game.date) && `, ${game.date.slice(0, 4)}`}.{" "}
              </>
            )}
            {game.credit}
            {over && game.url && (
              <>
                {" · "}
                <a href={game.url} target="_blank" rel="noopener noreferrer" className="underline decoration-ink-line underline-offset-2 hover:text-ink-muted">
                  See the game
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
