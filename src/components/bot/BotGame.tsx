"use client";

import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/avatar/Avatar";
import { useBotEngine } from "@/hooks/useBotEngine";
import { BOOK_MOVES, BOOK_PLIES, bookMoves, buildBook, pickBookMove, type Book } from "@/lib/bot/book";
import { buildPgn, pgnFilename } from "@/lib/chess/pgn";
import type { BotBookGame, PlayerDetail } from "@/types";

const Board = dynamic(() => import("@/components/analysis/Board"), {
  ssr: false,
  loading: () => <div className="aspect-square w-full animate-pulse rounded-lg bg-ink-raised" />,
});

type Color = "white" | "black";

/** A book move comes after this pause, so it does not land before the eye
 * has left the piece just moved. */
const BOOK_DELAY_MS = 450;
const START_FEN = new Chess().fen();

interface Played {
  san: string;
  from: string;
  to: string;
  fen: string;
  /** Played by the bot from the player's games. */
  book: boolean;
}

/** Where the game left the player's games, and how to say so. */
interface LeftBook {
  ply: number;
  text: string;
}

const moveLabel = (ply: number, san: string) => `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? "." : "…"} ${san}`;

function Plate({ name, rating, color, tag, avatar }: { name: string; rating: number | string | null; color: Color; tag?: string; avatar: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 px-0.5 text-[14px]">
      <span className="relative shrink-0">
        <Avatar src={avatar} size={32} />
        {/* Which colour they have, as a dot on the avatar. */}
        <span
          aria-hidden
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border ${color === "white" ? "border-neutral-400 bg-white" : "border-neutral-500 bg-neutral-900"}`}
        />
      </span>
      <span className="min-w-0 truncate font-[520] text-ink-text">{name}</span>
      {tag && <span className="shrink-0 rounded-pill bg-ink-raised px-2 py-0.5 text-[11px] font-[520] uppercase tracking-wide text-ink-muted">{tag}</span>}
      {rating && <span className="ml-auto shrink-0 text-[13px] tabular-nums text-ink-faint">{rating}</span>}
    </div>
  );
}

function resultOf(chess: Chess, resigned: boolean, botColor: Color, name: string): { text: string; tag: string } | null {
  const botWhite = botColor === "white";
  if (resigned) return { text: "You resigned.", tag: botWhite ? "1-0" : "0-1" };
  if (chess.isCheckmate()) {
    const whiteWon = chess.turn() === "b";
    const botWon = whiteWon === botWhite;
    return { text: botWon ? `Checkmate. ${name} bot wins.` : "Checkmate. You win.", tag: whiteWon ? "1-0" : "0-1" };
  }
  if (chess.isStalemate()) return { text: "Stalemate. A draw.", tag: "1/2-1/2" };
  if (chess.isThreefoldRepetition()) return { text: "Draw by repetition.", tag: "1/2-1/2" };
  if (chess.isInsufficientMaterial()) return { text: "Draw: neither side can mate.", tag: "1/2-1/2" };
  if (chess.isDraw()) return { text: "Draw by the fifty-move rule.", tag: "1/2-1/2" };
  return null;
}

/** " In their games Kamau faced 4… Nf6 (9 games) and 4… d6 (3) here." */
function facedNote(book: Book, fen: string, ply: number, name: string): string {
  const moves = bookMoves(book, fen);
  if (!moves.length) return "";
  const shown = moves.slice(0, 3).map((m, i) => `${moveLabel(ply, m.san)} (${m.count}${i === 0 ? (m.count === 1 ? " game" : " games") : ""})`);
  const more = moves.length > shown.length ? ", or something else" : "";
  const list = shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  return ` In their games ${name} faced ${list}${more} here.`;
}

/** "Kamau played Nf6 in 9 of 14 games here." */
function bookNote(book: Book, fen: string, san: string, name: string): string {
  const moves = bookMoves(book, fen);
  const total = moves.reduce((sum, m) => sum + m.count, 0);
  const count = moves.find((m) => m.san === san)?.count ?? 0;
  return total === 1 ? `${name} played ${san} in their one game here.` : `${name} played ${san} in ${count} of ${total} games here.`;
}

export function BotGame({
  player,
  me,
  botColor,
  openingLabel,
  games,
  allGames,
  elo,
  botAvatarSrc,
  youAvatarSrc,
  onExit,
}: {
  player: PlayerDetail;
  me: PlayerDetail | null;
  botColor: Color;
  openingLabel: string;
  /** The games of the chosen opening: the bot follows these first. */
  games: BotBookGame[];
  /** All the player's games in this colour: a game that leaves the chosen
   * opening for another of theirs is still in their prep. */
  allGames: BotBookGame[];
  elo: number;
  botAvatarSrc: string;
  youAvatarSrc: string;
  onExit: () => void;
}) {
  const name = player.full_name;
  const youColor: Color = botColor === "white" ? "black" : "white";
  const openingBook = useMemo(() => buildBook(games), [games]);
  const fullBook = useMemo(() => buildBook(allGames), [allGames]);
  const engine = useBotEngine();

  const [moves, setMoves] = useState<Played[]>([]);
  const [leftBook, setLeftBook] = useState<LeftBook | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // The game left the chosen opening for another of the player's: still
  // their prep, but not what was picked.
  const [outside, setOutside] = useState(false);
  const [resigned, setResigned] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [engineError, setEngineError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // The whole game replayed, so repetition and the fifty-move rule are seen.
  const chess = useMemo(() => {
    const c = new Chess();
    for (const m of moves) c.move(m.san);
    return c;
  }, [moves]);
  const fen = moves.length ? moves[moves.length - 1].fen : START_FEN;
  const result = resultOf(chess, resigned, botColor, name);
  const botToMove = !result && chess.turn() === botColor[0];
  const ply = moves.length;

  const play = useCallback((san: string, book: boolean) => {
    setMoves((prev) => {
      const c = new Chess(prev.length ? prev[prev.length - 1].fen : START_FEN);
      const m = c.move(san);
      return [...prev, { san: m.san, from: m.from, to: m.to, fen: c.fen(), book }];
    });
  }, []);

  // The bot's turn: one of the player's moves while the game is in their
  // games, the engine at the chosen strength after.
  const leftRef = useRef(leftBook);
  leftRef.current = leftBook;
  useEffect(() => {
    if (!botToMove) return;
    let cancelled = false;

    if (!leftRef.current && ply < BOOK_PLIES) {
      const book = bookMoves(openingBook, fen).length ? openingBook : fullBook;
      const pick = pickBookMove(book, fen);
      if (pick) {
        const timer = setTimeout(() => {
          if (cancelled) return;
          setNote(bookNote(book, fen, pick.san, name));
          setOutside(book !== openingBook && games !== allGames);
          play(pick.san, true);
        }, BOOK_DELAY_MS);
        return () => {
          cancelled = true;
          clearTimeout(timer);
        };
      }
      setLeftBook({ ply, text: `${name}'s games stop here. From now on the bot plays at ${elo}.` });
    } else if (!leftRef.current) {
      setLeftBook({ ply, text: `That's ${BOOK_MOVES} moves of ${name}'s prep. From now on the bot plays at ${elo}.` });
    }

    setNote(null);
    setThinking(true);
    engine.bestMove(fen, elo).then((uci) => {
      if (cancelled) return;
      setThinking(false);
      if (!uci) return setEngineError(true);
      const c = new Chess(fen);
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      play(m.san, false);
    });
    return () => {
      cancelled = true;
      engine.cancel();
      setThinking(false);
    };
    // A turn is a position: the rest is fixed for the game or read from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, botToMove]);

  const tryMove = useCallback(
    (from: string, to: string): boolean => {
      if (result || chess.turn() !== youColor[0]) return false;
      let san: string;
      try {
        san = new Chess(fen).move({ from, to, promotion: "q" }).san;
      } catch {
        return false;
      }
      // Still in their prep only if one of their games reached this move.
      if (!leftBook && ply < BOOK_PLIES && !bookMoves(fullBook, fen).some((m) => m.san === san)) {
        setLeftBook({
          ply,
          text: `You left ${name}'s prep with ${moveLabel(ply, san)}: none of their games reached it.${facedNote(fullBook, fen, ply, name)} From now on the bot plays at ${elo}.`,
        });
      }
      play(san, false);
      return true;
    },
    [result, chess, youColor, fen, leftBook, ply, fullBook, name, elo, play],
  );

  const onSquareClick = useCallback(
    (square: string) => {
      if (selected === square) return setSelected(null);
      const targets = (sq: string) => chess.moves({ square: sq as never, verbose: true }).map((m) => m.to as string);
      if (selected && targets(selected).includes(square)) {
        tryMove(selected, square);
        return setSelected(null);
      }
      const own = chess.get(square as never)?.color === youColor[0];
      setSelected(own && targets(square).length ? square : null);
    },
    [selected, chess, tryMove, youColor],
  );

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    const last = moves[moves.length - 1];
    if (last) {
      styles[last.from] = { backgroundColor: "rgba(255, 214, 10, 0.4)" };
      styles[last.to] = { backgroundColor: "rgba(255, 214, 10, 0.55)" };
    }
    if (selected) {
      styles[selected] = { backgroundColor: "rgba(246,195,68,0.8)" };
      for (const m of chess.moves({ square: selected as never, verbose: true })) {
        styles[m.to] = { background: "radial-gradient(circle, rgba(20,20,20,0.30) 22%, transparent 24%)" };
      }
    }
    return styles;
  }, [moves, selected, chess]);

  function newGame() {
    engine.cancel();
    setMoves([]);
    setLeftBook(null);
    setNote(null);
    setOutside(false);
    setResigned(false);
    setEngineError(false);
    setSelected(null);
  }

  // Back to the last position with you to move, and back into their prep if
  // the game left it after that.
  const yourParity = youColor === "white" ? 0 : 1;
  let takeBackTo = ply - 1;
  while (takeBackTo >= 0 && takeBackTo % 2 !== yourParity) takeBackTo -= 1;
  function takeBack() {
    if (takeBackTo < 0) return;
    engine.cancel();
    setMoves((prev) => prev.slice(0, takeBackTo));
    if (leftBook && leftBook.ply >= takeBackTo) setLeftBook(null);
    setNote(null);
    setOutside(false);
    setResigned(false);
    setEngineError(false);
    setSelected(null);
  }

  function download() {
    const white = botColor === "white" ? `${name} bot` : (me?.full_name ?? "You");
    const black = botColor === "black" ? `${name} bot` : (me?.full_name ?? "You");
    const tag = result?.tag ?? "*";
    const today = new Date().toISOString().slice(0, 10);
    const text = moves.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m.san}` : m.san)).join(" ");
    const pgn = buildPgn(
      { Event: `Play ${name} bot`, Site: "chesspreparatory.com", Date: today.replace(/-/g, "."), White: white, Black: black, Result: tag, BotElo: elo },
      `${text} ${tag}`,
    );
    const url = URL.createObjectURL(new Blob([pgn], { type: "application/x-chess-pgn" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = pgnFilename(white, black, today, tag);
    a.click();
    URL.revokeObjectURL(url);
  }

  const youName = me?.full_name ?? "You";
  const youRating = me ? (me.standard_rating ?? me.rapid_rating ?? me.blitz_rating) : null;
  const status = result
    ? result.text
    : engineError
      ? "The engine could not start in this browser, so the bot cannot move."
      : botToMove
        ? thinking
          ? `${name} bot is thinking…`
          : `${name} bot to move.`
        : "Your move.";

  // The move list as rows of two, the moves played from their games marked.
  const rows: Played[][] = [];
  moves.forEach((m, i) => (i % 2 === 0 ? rows.push([m]) : rows[rows.length - 1].push(m)));

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
      <header className="flex flex-col items-start gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            engine.cancel();
            onExit();
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border-2 border-accent px-3.5 py-1.5 text-[14px] font-[520] text-accent-soft hover:bg-accent hover:text-accent-on"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Openings
        </button>
        <div className="min-w-0 sm:pt-0.5">
          <h1 className="text-balance text-[18px] font-[520] leading-tight text-ink-text sm:text-[22px]">
            {name} bot · {openingLabel}
          </h1>
          <p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-ink-faint">
            <span>You play {youColor === "white" ? "White" : "Black"}</span>
            <span>Bot strength {elo}</span>
            <span>
              {games.length} {games.length === 1 ? "game" : "games"} in its book
            </span>
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section aria-label="Board" className="flex justify-center">
          <div className="flex w-full max-w-[min(100%,calc(100dvh-190px))] flex-col gap-1.5 lg:max-w-[min(100%,calc(100dvh-270px))]">
            <Plate name={name} rating={player.standard_rating ?? player.rapid_rating ?? player.blitz_rating} color={botColor} tag={`Bot · ${elo}`} avatar={botAvatarSrc} />
            <Board fen={fen} orientation={youColor} squareStyles={squareStyles} onDrop={tryMove} onSquareClick={onSquareClick} />
            <Plate name={youName} rating={youRating} color={youColor} avatar={youAvatarSrc} />
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-3">
          <section aria-label="Game" aria-live="polite" className="flex flex-col gap-2 rounded-xl bg-ink-card p-4">
            <p className="text-[15px] font-[520] text-ink-text">{status}</p>
            {leftBook ? (
              <p className="text-[14px] text-amber-700 dark:text-amber-400">{leftBook.text}</p>
            ) : (
              <p className="text-[14px] text-accent-soft">
                In {name}&apos;s prep{ply > 0 ? `, move ${Math.floor((ply - 1) / 2) + 1}` : ""}
                {outside ? `, in another of their openings (not the ${openingLabel})` : ""}.{note ? ` ${note}` : ""}
              </p>
            )}
          </section>

          <section aria-label="Moves" className="max-h-[45vh] overflow-y-auto rounded-xl bg-ink-card p-2 lg:max-h-[calc(100dvh-460px)] lg:min-h-[160px]">
            {rows.length === 0 ? (
              <p className="p-2 text-[14px] text-ink-faint">{botColor === "white" ? `${name} bot opens.` : "You open."}</p>
            ) : (
              <ol className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-0.5 text-[14px]">
                {rows.map((row, r) => (
                  <li key={r} className="contents">
                    <span className="px-1 py-0.5 tabular-nums text-ink-faint">{r + 1}.</span>
                    {row.map((m, k) => (
                      <span
                        key={k}
                        title={m.book ? `From ${name}'s games` : undefined}
                        className={`rounded px-1.5 py-0.5 ${m.book ? "text-accent-soft" : "text-ink-text"} ${r * 2 + k === ply - 1 ? "bg-ink-raised font-[520]" : ""}`}
                      >
                        {m.san}
                      </span>
                    ))}
                  </li>
                ))}
              </ol>
            )}
          </section>
          <p className="text-[12px] text-ink-faint">
            <span className="text-accent-soft">Green</span> moves are {name}&apos;s own, from their games.
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              { label: "Take back", onClick: takeBack, disabled: takeBackTo < 0 },
              { label: "Resign", onClick: () => setResigned(true), disabled: !!result || ply === 0 },
              { label: "New game", onClick: newGame, disabled: ply === 0 },
              { label: "Download PGN", onClick: download, disabled: ply === 0 },
            ].map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                disabled={a.disabled}
                className="rounded-pill bg-ink-card px-3.5 py-2 text-[13px] text-ink-muted hover:bg-ink-raised hover:text-ink-text disabled:opacity-40"
              >
                {a.label}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
