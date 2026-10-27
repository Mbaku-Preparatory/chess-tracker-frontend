"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AnalysisView, type AnalysisViewProps } from "@/components/analysis/AnalysisView";
import { api } from "@/lib/api";
import { pgnFilename, pgnHeaders } from "@/lib/chess/pgn";
import { scoresFromPlayerResult, scoresFromResultTag } from "@/lib/chessScore";

type Loaded = Awaited<ReturnType<typeof api.getGamePgn>>;

/** A scouted player's game. The PGN's own tags win; the game record fills the
 * gaps, and its result is relative to the scouted player, so it needs their
 * colour to read. */
function toView({ pgn_text, game, player }: Loaded): AnalysisViewProps {
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
    title: `${white.name} vs ${black.name}`,
    details: [
      game.date_played && new Date(`${game.date_played}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
      game.event && `${game.event}${game.round ? ` · Round ${game.round}` : ""}`,
      game.opening_name,
    ],
    filename: pgnFilename(white.name, black.name, game.date_played, result),
    shareUrl: null,
    importToLichess: true,
    back: { href: `/players/${player.slug}/games`, label: "Games" },
  };
}

export default function GameAnalysisPage() {
  const { ref } = useParams<{ ref: string }>();
  const [view, setView] = useState<AnalysisViewProps | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setView(null);
    setError(null);
    api
      .getGamePgn(ref)
      .then((data) => !cancelled && setView(toView(data)))
      .catch((err) => !cancelled && setError(err.message || "This game could not be loaded."));
    return () => {
      cancelled = true;
    };
  }, [ref]);

  if (error) return <p className="py-16 text-center text-[15px] text-ink-faint">{error}</p>;
  if (!view) return <div className="mx-auto aspect-square w-full max-w-[640px] animate-pulse rounded-xl bg-ink-raised" />;
  return <AnalysisView {...view} />;
}
