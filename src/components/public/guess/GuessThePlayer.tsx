"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { SharePanel } from "@/components/public/share/SharePanel";
import { federationFor } from "@/lib/federations";
import {
  ALIASES,
  answerFor,
  BORN_CLOSE,
  feedbackFor,
  loadGame,
  loadStats,
  MAX_GUESSES,
  msUntilNextPuzzle,
  playerById,
  puzzleNumber,
  RATING_CLOSE,
  recordResult,
  saveGame,
  searchPlayers,
  shareText,
  type Clue,
  type PoolPlayer,
  type Stats,
} from "@/lib/guessThePlayer";
import { profilePath } from "@/lib/publicPlayer";
import { SITE_URL } from "@/lib/site";

const TILE: Record<Clue["mark"], string> = {
  hit: "bg-[#2f9e44] text-white",
  close: "bg-[#e8a400] text-white",
  miss: "bg-[#c92a2a]/85 text-white",
};
const ARROW = { up: "↑", down: "↓" } as const;

function Tile({ clue, children, hint }: { clue: Clue; children: React.ReactNode; hint: string }) {
  return (
    <div
      className={`flex h-14 flex-col items-center justify-center rounded-lg text-center text-[15px] font-[600] tabular-nums leading-tight ${TILE[clue.mark]}`}
      title={hint}
    >
      <span>
        {children}
        {clue.direction && <span aria-hidden> {ARROW[clue.direction]}</span>}
      </span>
      <span className="sr-only">{hint}</span>
    </div>
  );
}

function numberHint(label: string, clue: Clue, up: string, down: string) {
  if (clue.mark === "hit") return `${label}: exactly right`;
  const near = clue.mark === "close" ? "close. " : "";
  return `${label}: ${near}${clue.direction === "up" ? up : down}`;
}

function GuessRow({ guess, answer }: { guess: PoolPlayer; answer: PoolPlayer }) {
  const f = feedbackFor(guess, answer);
  const fed = federationFor(guess.federation);
  return (
    <li className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_repeat(4,92px)] sm:items-center sm:gap-2">
      <Link href={profilePath(guess)} className="truncate text-[16px] font-[480] hover:text-accent-soft" title={`${guess.name}'s profile`}>
        {guess.name}
        {ALIASES[guess.fideId] && <span className="ml-1.5 font-normal text-ink-muted">({ALIASES[guess.fideId]})</span>}
      </Link>
      <div className="grid grid-cols-4 gap-2 sm:contents">
        <Tile clue={f.federation} hint={`Federation: ${f.federation.mark === "hit" ? "same" : f.federation.mark === "close" ? "same continent" : "different"}`}>
          <span className="block text-[18px] leading-none">{fed.flag || ""}</span>
          <span className="text-[13px]">{guess.federation}</span>
        </Tile>
        <Tile clue={f.title} hint={`Title: ${f.title.mark === "hit" ? "same" : "different"}`}>
          {guess.title || "—"}
        </Tile>
        <Tile clue={f.rating} hint={numberHint("Rating", f.rating, "the mystery player is rated higher", "the mystery player is rated lower")}>
          {guess.rating}
        </Tile>
        <Tile clue={f.born} hint={numberHint("Born", f.born, "the mystery player was born later", "the mystery player was born earlier")}>
          {guess.born}
        </Tile>
      </div>
    </li>
  );
}

function PlayerPicker({ exclude, onPick }: { exclude: Set<string>; onPick: (p: PoolPlayer) => void }) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const matches = useMemo(() => searchPlayers(query, exclude), [query, exclude]);

  const pick = (p: PoolPlayer) => {
    onPick(p);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={matches.length > 0}
        aria-controls={listId}
        aria-activedescendant={matches[active] ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Type a player's name"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && matches[active]) {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") setQuery("");
        }}
        className="h-14 w-full rounded-pill border border-ink-line bg-ink-card px-6 text-[17px] text-ink-text placeholder:text-ink-faint focus:border-accent focus:outline-none"
      />
      {matches.length > 0 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-[calc(100%+6px)] z-10 overflow-hidden rounded-xl border border-ink-line bg-ink-card shadow-lg">
          {matches.map((p, i) => {
            const fed = federationFor(p.federation);
            return (
              <li
                key={p.fideId}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(p);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-5 py-3 text-[16px] ${i === active ? "bg-ink-raised" : ""}`}
              >
                <span className="min-w-0 flex-1 truncate">
                  {p.title && <span className="mr-1.5 text-accent">{p.title}</span>}
                  {p.name}
                  {ALIASES[p.fideId] && <span className="ml-1.5 text-ink-muted">({ALIASES[p.fideId]})</span>}
                </span>
                <span className="shrink-0 text-[14px] text-ink-muted">
                  {fed.flag} {p.federation}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Countdown() {
  const [ms, setMs] = useState(() => msUntilNextPuzzle());
  useEffect(() => {
    const t = window.setInterval(() => setMs(msUntilNextPuzzle()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const s = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return <span className="tabular-nums">{`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`}</span>;
}

function StatsPanel({ stats }: { stats: Stats }) {
  const most = Math.max(1, ...stats.spread);
  const items = [
    ["Played", stats.played],
    ["Win %", stats.played ? Math.round((100 * stats.won) / stats.played) : 0],
    ["Streak", stats.streak],
    ["Best streak", stats.best],
  ] as const;
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-4 gap-2 text-center">
        {items.map(([label, value]) => (
          <div key={label}>
            <dd className="text-[26px] font-[480] tabular-nums">{value}</dd>
            <dt className="text-[12px] text-ink-muted">{label}</dt>
          </div>
        ))}
      </dl>
      <div>
        <h3 className="mb-2 text-[13px] uppercase tracking-[0.1em] text-ink-muted">Guesses to win</h3>
        <ol className="flex flex-col gap-1">
          {stats.spread.map((n, i) => (
            <li key={i} className="flex items-center gap-2 text-[13px] tabular-nums">
              <span className="w-3 text-ink-muted">{i + 1}</span>
              <span
                className={`h-5 rounded px-1.5 text-right ${n ? "bg-accent/80 text-accent-on" : "bg-ink-raised text-ink-muted"}`}
                style={{ width: `${Math.max(8, (100 * n) / most)}%` }}
              >
                {n}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * The game. Rendered only in the browser: the day's puzzle depends on the
 * visitor's own date, and their progress on their own storage.
 */
export function GuessThePlayer() {
  const [puzzle, setPuzzle] = useState<number | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const n = puzzleNumber();
    setPuzzle(n);
    setGuesses(loadGame(n).guesses);
    setStats(loadStats());
  }, []);

  const answer = puzzle ? answerFor(puzzle) : null;
  const guessed = guesses.map((id) => playerById(id)!).filter(Boolean);
  const won = !!answer && guesses.includes(answer.fideId);
  const over = won || guesses.length >= MAX_GUESSES;
  const exclude = useMemo(() => new Set(guesses), [guesses]);

  // A finished game counts once, when it finishes (or when an old finished one is first seen).
  useEffect(() => {
    if (!puzzle || !over) return;
    setStats(recordResult(puzzle, won ? guesses.length : null));
  }, [puzzle, over, won, guesses.length]);

  if (!puzzle || !answer) return <div className="mx-auto h-96 max-w-[760px] animate-pulse rounded-xl bg-ink-card" />;

  const guess = (p: PoolPlayer) => {
    if (over || exclude.has(p.fideId)) return;
    const next = [...guesses, p.fideId];
    setGuesses(next);
    saveGame({ puzzle, guesses: next });
    if (next.length === 1) track("Guess the player started", { puzzle });
    const done = p.fideId === answer.fideId || next.length >= MAX_GUESSES;
    if (done) track("Guess the player finished", { puzzle, won: p.fideId === answer.fideId, guesses: next.length });
  };

  const feedback = guessed.map((g) => feedbackFor(g, answer));
  const text = shareText(puzzle, feedback, won);
  const url = `${SITE_URL}/guess-the-player`;
  const fed = federationFor(answer.federation);

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-8">
      <header className="flex flex-col items-center gap-3 pt-4 text-center sm:pt-10">
        <p className="text-[13px] uppercase tracking-[0.12em] text-accent-soft">Daily puzzle #{puzzle}</p>
        <h1 className="text-[40px] font-[480] leading-[1.08] tracking-[0.01em] sm:text-[56px]">Guess the player</h1>
        <p className="max-w-[48ch] text-[17px] leading-[1.5] text-ink-muted">
          A mystery FIDE player every day. You have {MAX_GUESSES} guesses.
        </p>
      </header>

      <details className="rounded-xl bg-ink-card p-5 text-[15px] leading-[1.6] text-ink-muted [&_summary]:cursor-pointer">
        <summary className="font-[480] text-ink-text">How to play</summary>
        <div className="mt-3 flex flex-col gap-2">
          <p>Guess any player by name. Each guess shows four clues about the mystery player:</p>
          <ul className="list-disc pl-5">
            <li>
              <b className="text-ink-text">Federation</b>: green if the same, yellow if the same continent.
            </li>
            <li>
              <b className="text-ink-text">Title</b>: green if the same.
            </li>
            <li>
              <b className="text-ink-text">Rating</b>: green if exact, yellow within {RATING_CLOSE}. The arrow points to the mystery
              player&apos;s rating.
            </li>
            <li>
              <b className="text-ink-text">Born</b>: green if the same year, yellow within {BORN_CLOSE}. The arrow points to their year.
            </li>
          </ul>
          <p>A new player appears at midnight, wherever you are. Ratings are from FIDE&apos;s classical list.</p>
        </div>
      </details>

      {!over && (
        <div className="flex flex-col gap-2">
          <PlayerPicker exclude={exclude} onPick={guess} />
          <p className="px-2 text-[14px] text-ink-muted">
            Guess {guesses.length + 1} of {MAX_GUESSES}
          </p>
        </div>
      )}

      {over && (
        <section className="flex flex-col gap-6 rounded-xl bg-ink-card p-6 sm:p-8" aria-live="polite">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] uppercase tracking-[0.1em] text-ink-muted">
              {won ? `Solved in ${guesses.length} ${guesses.length === 1 ? "guess" : "guesses"}` : "Out of guesses"}
            </p>
            <h2 className="text-[28px] font-[480] leading-tight">
              {won ? "You got it: " : "It was "}
              <Link href={profilePath(answer)} className="text-accent hover:text-accent-soft">
                {answer.name}
              </Link>
            </h2>
            <p className="text-[15px] text-ink-muted">
              {answer.title} · {fed.flag} {fed.name} · rated {answer.rating} · born {answer.born}
            </p>
          </div>
          <SharePanel
            label="Share your result"
            text={text}
            url={url}
            copyText={`${text}\n${url}`}
            copyLabel="Copy result"
            onShared={(via) => track("Guess the player shared", { puzzle, via })}
          />
          {stats && <StatsPanel stats={stats} />}
          <p className="text-[15px] text-ink-muted">
            Next player in <Countdown />
          </p>
        </section>
      )}

      <ol className="flex flex-col gap-4" aria-label="Your guesses">
        <li className="hidden text-[12px] uppercase tracking-[0.08em] text-ink-faint sm:grid sm:grid-cols-[minmax(0,1fr)_repeat(4,92px)] sm:gap-2">
          <span>Player</span>
          <span className="text-center">Federation</span>
          <span className="text-center">Title</span>
          <span className="text-center">Rating</span>
          <span className="text-center">Born</span>
        </li>
        {guessed.map((g) => (
          <GuessRow key={g.fideId} guess={g} answer={answer} />
        ))}
        {!over &&
          Array.from({ length: MAX_GUESSES - guesses.length }, (_, i) => (
            <li key={`empty-${i}`} aria-hidden className="h-14 rounded-lg border border-dashed border-ink-line/80" />
          ))}
      </ol>
    </div>
  );
}
