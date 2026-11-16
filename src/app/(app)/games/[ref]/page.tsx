"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AnalysisView, type AnalysisViewProps } from "@/components/analysis/AnalysisView";
import { api } from "@/lib/api";
import { pgnFilename, pgnHeaders } from "@/lib/chess/pgn";
import { scoresFromPlayerResult, scoresFromResultTag } from "@/lib/chessScore";
import { formatGameDate } from "@/lib/games";
import { useLocale, useT, type Translate } from "@/hooks/useT";
import { msg } from "@/lib/i18n";

type Loaded = Awaited<ReturnType<typeof api.getGamePgn>>;

/** A scouted player's game. The PGN's own tags win; the game record fills the
 * gaps, and its result is relative to the scouted player, so it needs their
 * colour to read. Built at render, in the reader's language. */
function toView({ pgn_text, game, player }: Loaded, t: Translate, locale: string): AnalysisViewProps {
  const tags = pgnHeaders(pgn_text);
  const color = game.color_played === "black" ? "black" : "white";
  const scores = scoresFromResultTag(tags.Result) ?? scoresFromPlayerResult(game.result, color);
  const result =
    tags.Result ?? (scores.white === "1" ? "1-0" : scores.white === "0" ? "0-1" : scores.white === "½" ? "1/2-1/2" : "*");
  const side = (c: "white" | "black") => {
    const tagName = tags[c === "white" ? "White" : "Black"];
    const scouted = c === color;
    return {
      name: tagName ?? (scouted ? player.full_name : game.opponent_name),
      rating: tags[c === "white" ? "WhiteElo" : "BlackElo"] ?? (scouted ? null : game.opponent_rating),
      score: scores[c],
      href: scouted ? `/players/${player.slug}` : null,
    };
  };
  const white = side("white");
  const black = side("black");
  return {
    pgn: pgn_text,
    white,
    black,
    orientation: color,
    result,
    title: t("{white} vs {black}", { white: white.name, black: black.name }),
    details: [
      formatGameDate(game.date_played, "short", locale),
      game.event && `${game.event}${game.round ? ` · ${t("Round {round}", { round: game.round })}` : ""}`,
      game.opening_name,
    ],
    filename: pgnFilename(white.name, black.name, game.date_played, result),
    shareUrl: null,
    importToLichess: true,
    back: { href: `/players/${player.slug}/games` },
  };
}

export default function GameAnalysisPage() {
  const { ref } = useParams<{ ref: string }>();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT();
  const locale = useLocale();

  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    setError(null);
    api
      .getGamePgn(ref)
      .then((data) => !cancelled && setLoaded(data))
      .catch((err) => !cancelled && setError(err.message || msg("This game could not be loaded.")));
    return () => {
      cancelled = true;
    };
  }, [ref]);

  if (error) return <p className="py-16 text-center text-[15px] text-ink-faint">{t(error)}</p>;
  if (!loaded) return <div className="mx-auto aspect-square w-full max-w-[640px] animate-pulse rounded-xl bg-ink-raised" />;
  return <AnalysisView {...toView(loaded, t, locale)} />;
}
