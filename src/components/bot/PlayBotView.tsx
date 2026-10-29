"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/avatar/Avatar";
import { AvatarPicker } from "@/components/avatar/AvatarPicker";
import { ELO_MIN } from "@/hooks/useBotEngine";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { avatarSrc, defaultAvatar, resolveAvatar } from "@/lib/avatars";
import { groupOpenings } from "@/lib/bot/book";
import { useAppSelector } from "@/redux/hooks";
import type { BotBookGame, PlayerDetail } from "@/types";

import { BotGame } from "./BotGame";

type Color = "white" | "black";

/** The slider's top. The engine goes higher, but nobody we scout does. */
const SLIDER_MAX = 2900;
/** An unrated player's bot starts here. */
const UNRATED_ELO = 1500;
/** Fewer games than this, and the bot leaves the book early: say so. */
const FEW_GAMES = 5;

const ALL = "__all__";

const clampElo = (elo: number) => Math.min(SLIDER_MAX, Math.max(ELO_MIN, elo));

/**
 * "Play <player> bot": pick a colour and one of the openings the player plays
 * in it, pick a strength (their FIDE rating to start with), then play a bot
 * that opens the way they do. See lib/bot/book.ts for how it chooses.
 */
export function PlayBotView({ slug }: { slug: string }) {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [me, setMe] = useState<PlayerDetail | null>(null);
  const [books, setBooks] = useState<Record<Color, BotBookGame[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [color, setColor] = useState<Color>("white");
  const [opening, setOpening] = useState<string | null>(null);
  const [elo, setElo] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  // Faces. The bot's is saved on the player, yours on your account; null is
  // the default (for you, the photo from the navbar if you uploaded one).
  const { email, profilePic } = useAppSelector((s) => s.auth);
  const [botAvatar, setBotAvatar] = useState<number | null>(null);
  const [myAvatar, setMyAvatar] = useState<number | null>(null);
  const [picking, setPicking] = useState<"bot" | "me" | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  // The list can be long: bring the slider into view once an opening is picked.
  const strengthRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (opening) strengthRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [opening]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getPlayerDetail(slug), api.getBotBook(slug, "white"), api.getBotBook(slug, "black")])
      .then(([p, white, black]) => {
        if (cancelled) return;
        setPlayer(p);
        setBotAvatar(p.bot_avatar ?? null);
        setBooks({ white: white.games, black: black.games });
        // Start on the colour they have more games in.
        setColor(black.games.length > white.games.length ? "black" : "white");
      })
      .catch((err) => !cancelled && setError(userMessage(err, "Couldn't load this player's games.")));
    // Not having a profile of your own is fine: the plate says "You".
    api.getMyPlayer().then((m) => !cancelled && setMe(m.player)).catch(() => {});
    api.getMe().then((m) => !cancelled && setMyAvatar(m.avatar)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const rating = player ? (player.standard_rating ?? player.rapid_rating ?? player.blitz_rating) : null;
  const defaultElo = clampElo(rating ?? UNRATED_ELO);

  const groups = useMemo(() => (books ? groupOpenings(books[color]) : []), [books, color]);
  const colorGames = books?.[color] ?? [];
  const chosenGames = opening === ALL ? colorGames : (groups.find((g) => g.name === opening)?.games ?? []);

  if (error) return <p className="py-16 text-center text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!player || !books) {
    return <div className="mx-auto mt-8 h-64 max-w-3xl animate-pulse rounded-xl bg-ink-raised" />;
  }

  const name = player.full_name;
  const botDefaultSrc = avatarSrc(defaultAvatar(player.public_id));
  const botSrc = avatarSrc(resolveAvatar(botAvatar, player.public_id));
  const myDefaultSrc = profilePic || avatarSrc(defaultAvatar(me?.public_id ?? email ?? "you"));
  const mySrc = myAvatar ? avatarSrc(myAvatar) : myDefaultSrc;

  // Shown at once, saved behind; put back if the save fails.
  function pickAvatar(who: "bot" | "me", avatar: number | null) {
    setPicking(null);
    setAvatarError(null);
    const before = who === "bot" ? botAvatar : myAvatar;
    const set = who === "bot" ? setBotAvatar : setMyAvatar;
    set(avatar);
    (who === "bot" ? api.setBotAvatar(slug, avatar) : api.setMyAvatar(avatar)).catch((err) => {
      set(before);
      setAvatarError(userMessage(err, "Couldn't save that avatar. Try again."));
    });
  }

  const openingLabel = opening === ALL ? "All openings" : (opening ?? "");

  if (playing && opening) {
    return (
      <BotGame
        // A new choice is a new game.
        key={`${color}-${opening}-${elo}`}
        player={player}
        me={me}
        botColor={color}
        openingLabel={openingLabel}
        games={chosenGames}
        allGames={colorGames}
        elo={elo ?? defaultElo}
        botAvatarSrc={botSrc}
        youAvatarSrc={mySrc}
        onExit={() => setPlaying(false)}
      />
    );
  }

  const other = (c: Color): Color => (c === "white" ? "black" : "white");
  const cap = (c: Color) => c[0].toUpperCase() + c.slice(1);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col items-start gap-3 sm:flex-row">
        <Link
          href={`/players/${slug}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border-2 border-accent px-3.5 py-1.5 text-[14px] font-[520] text-accent-soft hover:bg-accent hover:text-accent-on"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div className="min-w-0 sm:pt-0.5">
          <h1 className="text-balance text-[22px] font-[520] leading-tight text-ink-text">Play {name} bot</h1>
          <p className="mt-1 text-[14px] text-ink-faint">
            The bot opens the way {name} does, move for move from their games, then plays at the strength you choose.
          </p>
        </div>
      </header>

      <section aria-label="Avatars" className="flex flex-col gap-2 rounded-xl bg-ink-card p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {[
            { who: "bot" as const, src: botSrc, label: `${name} bot` },
            { who: "me" as const, src: mySrc, label: me?.full_name ?? "You" },
          ].map((a) => (
            <div key={a.who} className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setPicking(a.who)} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={`Change the avatar for ${a.label}`}>
                <Avatar src={a.src} size={52} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-[520] text-ink-text">{a.label}</p>
                <button type="button" onClick={() => setPicking(a.who)} className="text-[13px] text-accent-soft underline">
                  Change avatar
                </button>
              </div>
            </div>
          ))}
        </div>
        {avatarError && <p className="text-[13px] text-red-600 dark:text-red-400">{avatarError}</p>}
      </section>

      {picking === "bot" && (
        <AvatarPicker
          title={`Avatar for ${name} bot`}
          current={botAvatar}
          defaultSrc={botDefaultSrc}
          defaultLabel="Default"
          onPick={(n) => pickAvatar("bot", n)}
          onClose={() => setPicking(null)}
        />
      )}
      {picking === "me" && (
        <AvatarPicker
          title="Your avatar"
          current={myAvatar}
          defaultSrc={myDefaultSrc}
          defaultLabel={profilePic ? "Your photo" : "Default"}
          onPick={(n) => pickAvatar("me", n)}
          onClose={() => setPicking(null)}
        />
      )}

      <section aria-label="Openings" className="flex flex-col gap-3 rounded-xl bg-ink-card p-4">
        <div role="tablist" className="flex w-fit gap-1 rounded-lg bg-ink-raised p-1">
          {(["white", "black"] as Color[]).map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={color === c}
              type="button"
              onClick={() => {
                setColor(c);
                setOpening(null);
              }}
              className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-[14px] font-[520] ${
                color === c ? "bg-ink-card text-ink-text shadow" : "text-ink-muted hover:text-ink-text"
              }`}
            >
              <span
                aria-hidden
                className={`h-3 w-3 rounded-full border ${c === "white" ? "border-neutral-300 bg-white" : "border-neutral-600 bg-neutral-900"}`}
              />
              As {cap(c)}
              <span className="tabular-nums text-ink-faint">{books[c].length}</span>
            </button>
          ))}
        </div>

        <p className="text-[14px] text-ink-muted">
          {name} plays {cap(color)}. You play {cap(other(color))}.
        </p>

        {colorGames.length === 0 ? (
          <p className="rounded-lg bg-ink-raised/60 p-4 text-[14px] text-ink-muted">
            None of {name}&apos;s games as {cap(color)} have moves we can read.{" "}
            <Link href={`/players/${slug}/import`} className="text-accent-soft underline">
              Import games
            </Link>{" "}
            to build this side of the bot.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {[{ name: ALL, label: "All openings", games: colorGames, variations: ["Plays the mix of openings they play"] }, ...groups.map((g) => ({ ...g, label: g.name }))].map(
              (g) => {
                const active = opening === g.name;
                const pct = Math.round((g.games.length / colorGames.length) * 100);
                return (
                  <li key={g.name}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setOpening(g.name);
                        if (elo === null) setElo(defaultElo);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left ${
                        active ? "border-accent bg-accent/10" : "border-ink-line hover:bg-ink-raised"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-[520] text-ink-text">{g.label}</p>
                        {g.variations.length > 0 && <p className="truncate text-[13px] text-ink-faint">{g.variations.join(" · ")}</p>}
                      </div>
                      {g.name !== ALL && (
                        <div aria-hidden className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-ink-raised sm:block">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                      <span className="shrink-0 whitespace-nowrap text-right text-[13px] tabular-nums text-ink-muted">
                        {g.games.length} {g.games.length === 1 ? "game" : "games"}
                      </span>
                    </button>
                  </li>
                );
              },
            )}
          </ul>
        )}
      </section>

      {opening && elo !== null && (
        <section ref={strengthRef} aria-label="Strength" className="flex flex-col gap-3 rounded-xl bg-ink-card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="bot-elo" className="text-[15px] font-[520] text-ink-text">
              Bot strength
            </label>
            <span className="text-[22px] font-[520] tabular-nums text-ink-text">{elo}</span>
          </div>
          <input
            id="bot-elo"
            type="range"
            min={ELO_MIN}
            max={SLIDER_MAX}
            step={10}
            value={elo}
            onChange={(e) => setElo(Number(e.target.value))}
            className="w-full accent-[rgb(var(--accent))]"
          />
          <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-ink-faint">
            <span>
              {rating ? `${name}'s FIDE rating: ${rating}` : `${name} has no FIDE rating, so the bot starts at ${UNRATED_ELO}`}
            </span>
            {elo !== defaultElo && (
              <button type="button" onClick={() => setElo(defaultElo)} className="text-accent-soft underline">
                Reset
              </button>
            )}
          </p>
          {rating !== null && rating < ELO_MIN && (
            <p className="text-[13px] text-ink-faint">The engine plays no weaker than {ELO_MIN}.</p>
          )}
          {chosenGames.length < FEW_GAMES && (
            <p className="text-[13px] text-amber-700 dark:text-amber-400">
              Only {chosenGames.length} {chosenGames.length === 1 ? "game" : "games"} here, so the bot will leave {name}&apos;s moves early.
            </p>
          )}
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="mt-1 self-start rounded-pill bg-accent px-5 py-2 text-[15px] font-[520] text-accent-on hover:opacity-90"
          >
            Play as {cap(other(color))}
          </button>
        </section>
      )}
    </div>
  );
}
