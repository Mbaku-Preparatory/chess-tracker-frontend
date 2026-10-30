"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/avatar/Avatar";
import { AvatarPicker } from "@/components/avatar/AvatarPicker";
import { usePreferences } from "@/components/PreferencesProvider";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { avatarSrc, defaultAvatar, resolveAvatar } from "@/lib/avatars";
import { useAppSelector } from "@/redux/hooks";
import type { BotBookGame, PlayerDetail } from "@/types";

import { BotGame } from "./BotGame";
import { BotSetup, defaultBotElo, startingColor, type BotColor as Color } from "./BotSetup";

/**
 * "Play <player> bot": pick a colour and a strength (their FIDE rating to
 * start with), then play a bot that opens the way they do in that colour.
 * See lib/bot/book.ts for how it chooses.
 */
export function PlayBotView({ slug }: { slug: string }) {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  // The plate's name, from the account: there is no player row for you.
  const [youName, setYouName] = useState("You");
  const [books, setBooks] = useState<Record<Color, BotBookGame[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [color, setColor] = useState<Color>("white");
  const [elo, setElo] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  // Faces. The bot's is saved on the player, yours on your account; null is
  // the default (for you, the photo from the navbar if you uploaded one).
  const email = useAppSelector((s) => s.auth.email);
  const { preferences, setAvatar: showAvatar } = usePreferences();
  const [botAvatar, setBotAvatar] = useState<number | null>(null);
  const [myAvatar, setMyAvatar] = useState<number | null>(null);
  const [picking, setPicking] = useState<"bot" | "me" | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getPlayerDetail(slug), api.getBotBook(slug, "white"), api.getBotBook(slug, "black")])
      .then(([p, white, black]) => {
        if (cancelled) return;
        setPlayer(p);
        setBotAvatar(p.bot_avatar ?? null);
        setBooks({ white: white.games, black: black.games });
        // Start on the colour they have more games in.
        setColor(startingColor({ white: white.games, black: black.games }));
      })
      .catch((err) => !cancelled && setError(userMessage(err, "Couldn't load this player's games.")));
    api
      .getMe()
      .then((m) => {
        if (cancelled) return;
        setMyAvatar(m.avatar);
        setYouName(`${m.first_name} ${m.last_name}`.trim() || m.username || "You");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const rating = player ? (player.standard_rating ?? player.rapid_rating ?? player.blitz_rating) : null;

  if (error) return <p className="py-16 text-center text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!player || !books) {
    return <div className="mx-auto mt-8 h-64 max-w-3xl animate-pulse rounded-xl bg-ink-raised" />;
  }

  const name = player.full_name;
  const botDefaultSrc = avatarSrc(defaultAvatar(player.public_id));
  const botSrc = avatarSrc(resolveAvatar(botAvatar, player.public_id));
  const myDefaultSrc = avatarSrc(defaultAvatar(email ?? "you"));
  const mySrc = myAvatar ? avatarSrc(myAvatar) : myDefaultSrc;

  // Shown at once, saved behind; put back if the save fails.
  function pickAvatar(who: "bot" | "me", avatar: number | null) {
    setPicking(null);
    setAvatarError(null);
    const before = who === "bot" ? botAvatar : myAvatar;
    // Yours shows in the navbar too.
    const set = who === "bot" ? setBotAvatar : (n: number | null) => (setMyAvatar(n), showAvatar(n));
    set(avatar);
    (who === "bot" ? api.setBotAvatar(slug, avatar) : api.setMyAvatar(avatar)).catch((err) => {
      set(before);
      setAvatarError(userMessage(err, "Couldn't save that avatar. Try again."));
    });
  }

  const strength = elo ?? defaultBotElo(rating);

  // Both the setup and the game open these.
  const pickers = (
    <>
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
          defaultLabel="Default"
          onPick={(n) => pickAvatar("me", n)}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  );

  if (playing) {
    return (
      <>
        <BotGame
          // A new choice is a new game.
          key={`${color}-${strength}`}
          botName={player.full_name}
          botRating={rating}
          youName={youName}
          botColor={color}
          games={books[color]}
          elo={strength}
          botAvatarSrc={botSrc}
          youAvatarSrc={mySrc}
          onChangeAvatar={setPicking}
          speech={preferences.bot_speech}
          onExit={() => setPlaying(false)}
        />
        {pickers}
      </>
    );
  }

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
            { who: "me" as const, src: mySrc, label: youName },
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

      {pickers}

      <BotSetup
        name={name}
        rating={rating}
        books={books}
        color={color}
        onColorChange={setColor}
        elo={elo}
        onEloChange={setElo}
        onPlay={() => setPlaying(true)}
        emptyHint={
          <>
            <Link href={`/players/${slug}/import`} className="text-accent-soft underline">
              Import games
            </Link>{" "}
            to build this side of the bot.
          </>
        }
      />
    </div>
  );
}
