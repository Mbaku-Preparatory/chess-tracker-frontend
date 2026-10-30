"use client";

import type { ReactNode } from "react";

import { ELO_MIN } from "@/hooks/useBotEngine";
import type { BotBookGame } from "@/types";

export type BotColor = "white" | "black";

/** The slider's top. The engine goes higher, but nobody we scout does. */
const SLIDER_MAX = 2900;
/** An unrated player's bot starts here. */
const UNRATED_ELO = 1500;
/** Fewer games than this, and the bot leaves the book early: say so. */
const FEW_GAMES = 5;

/** The bot's strength before the slider is touched: the player's own rating. */
export const defaultBotElo = (rating: number | null) => Math.min(SLIDER_MAX, Math.max(ELO_MIN, rating ?? UNRATED_ELO));

/** The bot starts on the colour the player has more games in. */
export const startingColor = (books: Record<BotColor, BotBookGame[]>): BotColor =>
  books.black.length > books.white.length ? "black" : "white";

const other = (c: BotColor): BotColor => (c === "white" ? "black" : "white");
const cap = (c: BotColor) => c[0].toUpperCase() + c.slice(1);

/**
 * The setup card for "Play <player> bot", in the app and on the public page:
 * your colour, the bot's strength, Play. Each page keeps its own header and
 * what happens around the game; everything about the bot itself lives here
 * and in BotGame.
 */
export function BotSetup({
  name,
  rating,
  books,
  color,
  onColorChange,
  elo,
  onEloChange,
  onPlay,
  header,
  emptyHint,
  note,
}: {
  name: string;
  rating: number | null;
  books: Record<BotColor, BotBookGame[]>;
  /** The bot's colour. */
  color: BotColor;
  onColorChange: (color: BotColor) => void;
  /** null until the slider is moved: the player's rating. */
  elo: number | null;
  onEloChange: (elo: number | null) => void;
  onPlay: () => void;
  /** Above the controls, inside the card. */
  header?: ReactNode;
  /** After "None of their games as White…": what to do about it. */
  emptyHint?: ReactNode;
  /** Beside the Play button. */
  note?: ReactNode;
}) {
  const defaultElo = defaultBotElo(rating);
  const strength = elo ?? defaultElo;
  const games = books[color];

  return (
    <section aria-label="Game" className="flex flex-col gap-4 rounded-xl bg-ink-card p-4 sm:p-6">
      {header}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[15px] font-[520] text-ink-text">You play</span>
        <div role="radiogroup" aria-label="Your colour" className="flex w-fit gap-1 rounded-lg bg-ink-raised p-1">
          {(["white", "black"] as BotColor[]).map((c) => {
            // The bot plays the other colour, so its book is that side's games.
            const active = color === other(c);
            return (
              <button
                key={c}
                role="radio"
                aria-checked={active}
                type="button"
                onClick={() => onColorChange(other(c))}
                className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-[14px] font-[520] ${
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
        {games.length > 0 && (
          <span className="text-[13px] text-ink-faint">
            {games.length} of their games as {cap(color)}
          </span>
        )}
      </div>

      {games.length === 0 ? (
        <p className="rounded-lg bg-ink-raised/60 p-4 text-[14px] text-ink-muted">
          None of {name}&apos;s games as {cap(color)} have moves we can read.{emptyHint && <> {emptyHint}</>}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="bot-elo" className="text-[15px] font-[520] text-ink-text">
                Bot strength
              </label>
              <span className="text-[22px] font-[520] tabular-nums text-ink-text">{strength}</span>
            </div>
            <input
              id="bot-elo"
              type="range"
              min={ELO_MIN}
              max={SLIDER_MAX}
              step={10}
              value={strength}
              onChange={(e) => onEloChange(Number(e.target.value))}
              className="w-full accent-[rgb(var(--accent))]"
            />
            <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-ink-faint">
              <span>{rating ? `${name}'s FIDE rating: ${rating}` : `${name} has no FIDE rating, so the bot starts at ${UNRATED_ELO}`}</span>
              {strength !== defaultElo && (
                <button type="button" onClick={() => onEloChange(null)} className="text-accent-soft underline">
                  Reset
                </button>
              )}
            </p>
            {rating !== null && rating < ELO_MIN && <p className="text-[13px] text-ink-faint">The engine plays no weaker than {ELO_MIN}.</p>}
            {games.length < FEW_GAMES && (
              <p className="text-[13px] text-amber-700 dark:text-amber-400">
                Only {games.length} {games.length === 1 ? "game" : "games"} as {cap(color)}, so the bot will leave {name}&apos;s moves early.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onPlay}
              className="rounded-pill bg-accent px-6 py-2.5 text-[15px] font-[520] text-accent-on hover:bg-accent-soft"
            >
              Play as {cap(other(color))}
            </button>
            {note && <span className="text-[13px] text-ink-faint">{note}</span>}
          </div>
        </>
      )}
    </section>
  );
}
