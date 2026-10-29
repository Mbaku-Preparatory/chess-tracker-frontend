"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/avatar/Avatar";
import { BotGame } from "@/components/bot/BotGame";
import { PlayerSearch } from "@/components/public/PlayerSearch";
import { ELO_MIN } from "@/hooks/useBotEngine";
import { authStorage } from "@/lib/auth";
import { avatarSrc, defaultAvatar } from "@/lib/avatars";
import { GRAPHQL_URL } from "@/lib/site";
import type { BotBookGame } from "@/types";

type Color = "white" | "black";

/** The one free game, remembered on this device. Signed-in visitors have no limit. */
const FREE_KEY = "cs_free_bot";
/** How long to wait for a player's games to arrive from chess-results. */
const POLL_EVERY_MS = 3000;
const GIVE_UP_AFTER_MS = 4 * 60 * 1000;
const SLIDER_MAX = 2900;
const UNRATED_ELO = 1500;

interface Target {
  fideId: string;
  fullName: string;
  rating: number | null;
}

type Phase =
  | { kind: "search"; message?: string }
  | { kind: "finding"; target: Target }
  | { kind: "setup"; target: Target; books: Record<Color, BotBookGame[]> }
  | { kind: "playing"; target: Target; books: Record<Color, BotBookGame[]> }
  | { kind: "used"; name: string | null };

const PLAYER = `query P($fideId: String!) {
  publicPlayer(fideId: $fideId) { fideId fullName standardRating rapidRating blitzRating gamesFetchedAt refreshStatus }
}`;
const REFRESH = `mutation R($fideId: String!) { requestProfileRefresh(fideId: $fideId) { outcome } }`;
const BOOK = `query B($fideId: String!, $color: BotColor!) {
  publicBotBook(fideId: $fideId, color: $color) {
    openingName eco date moves publicId opponent opponentRating result event
  }
}`;

type PublicPlayer = {
  fideId: string;
  fullName: string;
  standardRating: number | null;
  rapidRating: number | null;
  blitzRating: number | null;
  gamesFetchedAt: string | null;
  refreshStatus: string | null;
};

type BookRow = {
  openingName: string;
  eco: string;
  date: string | null;
  moves: string[];
  publicId: string;
  opponent: string;
  opponentRating: number | null;
  result: string;
  event: string;
};

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || body.errors?.length) {
    throw new Error(body?.errors?.[0]?.message ?? "Something went wrong. Try again in a moment.");
  }
  return body.data as T;
}

/** The private book's shape, so the same game screen plays both. */
const toBookGame = (g: BookRow): BotBookGame => ({
  opening_family: "",
  opening_name: g.openingName,
  eco: g.eco,
  date: g.date,
  moves: g.moves,
  public_id: g.publicId,
  opponent: g.opponent,
  opponent_rating: g.opponentRating,
  result: g.result as BotBookGame["result"],
  event: g.event,
});

function readFree(): { fideId: string; name: string } | null {
  try {
    const raw = localStorage.getItem(FREE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeFree(target: Target) {
  try {
    localStorage.setItem(FREE_KEY, JSON.stringify({ fideId: target.fideId, name: target.fullName, at: new Date().toISOString() }));
  } catch {
    // Private mode or blocked storage: the game still plays.
  }
}

const cap = (c: Color) => c[0].toUpperCase() + c.slice(1);
const other = (c: Color): Color => (c === "white" ? "black" : "white");

/**
 * "Create your own bot", for anyone: pick any FIDE-rated player, and play a
 * bot that opens the way they do, from the games chess-results published.
 *
 * Without an account it is one game: the first press of Play is remembered on
 * this device, and after that the page asks them to sign up. Signed in, there
 * is no limit (the app has the full version, on their own opponents).
 */
export function PublicBot({ initialFideId }: { initialFideId?: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "search" });
  const [signedIn, setSignedIn] = useState(false);
  const [color, setColor] = useState<Color>("white");
  const [elo, setElo] = useState<number | null>(null);
  const [findingNote, setFindingNote] = useState("Looking up their games…");
  const ticket = useRef(0);
  // The page's heading sits above: bring the board up when the game starts.
  const gameRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase.kind === "playing") gameRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase.kind]);

  const pick = useCallback(async (fideId: string) => {
    const mine = ++ticket.current;
    const stale = () => mine !== ticket.current;
    setFindingNote("Looking up their games…");
    try {
      let player = (await graphql<{ publicPlayer: PublicPlayer | null }>(PLAYER, { fideId })).publicPlayer;
      if (!player) return setPhase({ kind: "search", message: "FIDE doesn't rate that player. Try another name." });
      const target: Target = {
        fideId: player.fideId,
        fullName: player.fullName,
        rating: player.standardRating ?? player.rapidRating ?? player.blitzRating,
      };
      if (stale()) return;
      setPhase({ kind: "finding", target });

      // Never fetched: ask chess-results now, and wait for the worker.
      if (!player.gamesFetchedAt) {
        setFindingNote(`Finding ${target.fullName}'s games on chess-results.com. This can take a minute.`);
        if (!player.refreshStatus) {
          const { requestProfileRefresh } = await graphql<{ requestProfileRefresh: { outcome: string } }>(REFRESH, { fideId });
          if (requestProfileRefresh.outcome === "busy" || requestProfileRefresh.outcome === "refused") {
            if (!stale()) setPhase({ kind: "search", message: "We can't fetch new games right now. Try again in a few minutes, or pick another player." });
            return;
          }
        }
        const started = Date.now();
        while (!player?.gamesFetchedAt) {
          if (Date.now() - started > GIVE_UP_AFTER_MS) {
            if (!stale()) setPhase({ kind: "search", message: "chess-results is slow right now. Try again in a few minutes." });
            return;
          }
          await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
          if (stale()) return;
          player = (await graphql<{ publicPlayer: PublicPlayer | null }>(PLAYER, { fideId })).publicPlayer;
        }
      }

      const [white, black] = await Promise.all(
        (["WHITE", "BLACK"] as const).map((c) => graphql<{ publicBotBook: BookRow[] }>(BOOK, { fideId, color: c })),
      );
      if (stale()) return;
      const books = { white: white.publicBotBook.map(toBookGame), black: black.publicBotBook.map(toBookGame) };
      if (!books.white.length && !books.black.length) {
        return setPhase({
          kind: "search",
          message: `chess-results has no games with moves for ${target.fullName}, so there is nothing to build a bot from. Try another player.`,
        });
      }
      // The bot plays the colour they have more games in; you take the other.
      setColor(books.black.length > books.white.length ? "black" : "white");
      setElo(null);
      setPhase({ kind: "setup", target, books });
    } catch (err) {
      if (!stale()) setPhase({ kind: "search", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }, []);

  // Look once, on the client: the session and the free game live in localStorage.
  useEffect(() => {
    const isSignedIn = Boolean(authStorage.getToken());
    setSignedIn(isSignedIn);
    const used = readFree();
    if (used && !isSignedIn) return setPhase({ kind: "used", name: used.name });
    if (initialFideId && /^\d{3,10}$/.test(initialFideId)) pick(initialFideId);
  }, [initialFideId, pick]);

  if (phase.kind === "used") {
    return (
      <section aria-label="Your free game" className="flex flex-col items-start gap-4 rounded-xl bg-ink-card p-6 sm:p-8">
        <h2 className="text-[24px] font-[480] leading-tight">You&apos;ve played your free game{phase.name ? ` against ${phase.name} bot` : ""}.</h2>
        <p className="max-w-[60ch] text-[16px] leading-[1.5] text-ink-muted">
          Create a free account to keep playing: build a bot from any opponent you scout, at any strength, and prepare against the openings
          they actually play.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft">
            Create a free account
          </Link>
          <Link href="/login" className="rounded-pill border border-ink-text/80 px-6 py-3 text-[16px] text-ink-text hover:bg-ink-raised">
            Log in
          </Link>
        </div>
      </section>
    );
  }

  if (phase.kind === "playing") {
    const { target, books } = phase;
    return (
      <div ref={gameRef} className="scroll-mt-20">
        <BotGame
          key={`${target.fideId}-${color}-${elo}`}
          botName={target.fullName}
          botRating={target.rating}
          gameHref={(publicId) => `/game/${publicId}`}
          guest={signedIn ? undefined : { signupHref: "/signup" }}
          youName="You"
          botColor={color}
          games={books[color]}
          elo={elo ?? Math.min(SLIDER_MAX, Math.max(ELO_MIN, target.rating ?? UNRATED_ELO))}
          botAvatarSrc={avatarSrc(defaultAvatar(target.fideId))}
          youAvatarSrc={avatarSrc(defaultAvatar("you"))}
          onExit={() => (signedIn ? setPhase({ kind: "setup", target, books }) : setPhase({ kind: "used", name: target.fullName }))}
        />
      </div>
    );
  }

  if (phase.kind === "finding") {
    return (
      <section aria-label="Finding games" aria-live="polite" className="flex items-center gap-4 rounded-xl bg-ink-card p-6">
        <span aria-hidden className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <div>
          <p className="text-[16px] font-[480]">{phase.target.fullName}</p>
          <p className="text-[14px] text-ink-muted">{findingNote}</p>
        </div>
      </section>
    );
  }

  if (phase.kind === "setup") {
    const { target, books } = phase;
    const defaultElo = Math.min(SLIDER_MAX, Math.max(ELO_MIN, target.rating ?? UNRATED_ELO));
    const strength = elo ?? defaultElo;
    const games = books[color];
    return (
      <section aria-label="Your bot" className="flex flex-col gap-5 rounded-xl bg-ink-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar src={avatarSrc(defaultAvatar(target.fideId))} size={56} />
            <div className="min-w-0">
              <h2 className="truncate text-[22px] font-[480] leading-tight">{target.fullName} bot</h2>
              <p className="text-[14px] text-ink-muted">
                Built from {books.white.length + books.black.length} of their games on chess-results.com
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setPhase({ kind: "search" })} className="text-[14px] text-accent-soft underline">
            Choose another player
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[15px] font-[480]">You play</span>
          <div role="radiogroup" aria-label="Your colour" className="flex w-fit gap-1 rounded-lg bg-ink-raised p-1">
            {(["white", "black"] as Color[]).map((c) => {
              const active = color === other(c);
              const theirs = books[other(c)].length;
              return (
                <button
                  key={c}
                  role="radio"
                  aria-checked={active}
                  type="button"
                  disabled={theirs === 0}
                  onClick={() => setColor(other(c))}
                  className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-[14px] font-[480] disabled:opacity-40 ${
                    active ? "bg-ink-card text-ink-text shadow" : "text-ink-muted hover:text-ink-text"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-3 w-3 rounded-full border ${c === "white" ? "border-neutral-300 bg-white" : "border-neutral-600 bg-neutral-900"}`}
                  />
                  {cap(c)}
                </button>
              );
            })}
          </div>
          <span className="text-[13px] text-ink-faint">
            {games.length} of their games as {cap(color)}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="public-bot-elo" className="text-[15px] font-[480]">
              Bot strength
            </label>
            <span className="text-[22px] font-[480] tabular-nums">{strength}</span>
          </div>
          <input
            id="public-bot-elo"
            type="range"
            min={ELO_MIN}
            max={SLIDER_MAX}
            step={10}
            value={strength}
            onChange={(e) => setElo(Number(e.target.value))}
            className="w-full accent-[rgb(var(--accent))]"
          />
          <p className="text-[13px] text-ink-faint">
            {target.rating ? `${target.fullName}'s FIDE rating: ${target.rating}` : `Unrated, so the bot starts at ${UNRATED_ELO}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (!signedIn) writeFree(target);
              setPhase({ kind: "playing", target, books });
            }}
            className="rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft"
          >
            Play as {cap(other(color))}
          </button>
          {!signedIn && <span className="text-[13px] text-ink-faint">Without an account you get one free game.</span>}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Choose a player" className="flex flex-col gap-3">
      <PlayerSearch
        onPick={(p) => pick(p.fideId)}
        placeholder="Player name or FIDE ID"
        buttonLabel="Build bot"
      />
      {phase.message && <p className="max-w-[60ch] text-[14px] text-result-loss">{phase.message}</p>}
    </section>
  );
}
