"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AnalysisView } from "@/components/analysis/AnalysisView";
import { api } from "@/lib/api";
import { buildPgn, pgnFilename } from "@/lib/chess/pgn";
import { NO_SCORES, scoresFromResultTag } from "@/lib/chessScore";
import type { MasterGame } from "@/types";

export default function MasterGameAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<MasterGame | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setGame(null);
    setError(null);
    api
      .getMasterGame(id)
      .then((g) => !cancelled && setGame(g))
      .catch((err) => !cancelled && setError(err.message || "This game could not be loaded."));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p className="py-16 text-center text-[15px] text-ink-faint">{error}</p>;
  if (!game) return <div className="mx-auto aspect-square w-full max-w-[640px] animate-pulse rounded-xl bg-ink-raised" />;

  // A master game's result is already the PGN token, readable without a colour.
  const scores = scoresFromResultTag(game.result) ?? NO_SCORES;
  const pgn = buildPgn(
    {
      Event: game.event, Site: game.site, Date: game.year ? `${game.year}.??.??` : null,
      White: game.white, Black: game.black, Result: game.result,
      WhiteElo: game.white_elo, BlackElo: game.black_elo, ECO: game.eco, Opening: game.opening_name,
    },
    game.moves ?? "",
  );

  return (
    <AnalysisView
      pgn={pgn}
      white={{ name: game.white, rating: game.white_elo, score: scores.white }}
      black={{ name: game.black, rating: game.black_elo, score: scores.black }}
      result={game.result}
      title={`${game.white} vs ${game.black}`}
      details={[game.year ? String(game.year) : null, game.event, game.opening_name && `${game.eco} · ${game.opening_name}`]}
      filename={pgnFilename(game.white, game.black, game.year, game.result)}
      shareUrl={null}
      importToLichess
      back={{ href: "/explorer" }}
    />
  );
}
