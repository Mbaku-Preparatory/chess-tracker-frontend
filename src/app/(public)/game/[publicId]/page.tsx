import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AnalysisView } from "@/components/analysis/AnalysisView";
import { buildPgn, pgnFilename } from "@/lib/chess/pgn";
import { NO_SCORES, scoresFromResultTag } from "@/lib/chessScore";
import { formatGameDate } from "@/lib/games";
import { fetchPublicGame, gamePath } from "@/lib/publicGame";
import { profilePath, titledName } from "@/lib/publicPlayer";
import { SHARE_IMAGE, SITE_URL } from "@/lib/site";

type Params = Promise<{ publicId: string }>;

async function load(params: Params) {
  const { publicId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) notFound();
  const game = await fetchPublicGame(publicId);
  if (!game) notFound();
  return game;
}

const formatDate = (date: string | null) => formatGameDate(date, "long");

/** "Carlsen vs Nakamura": what someone searching for a game types. */
function names(game: Awaited<ReturnType<typeof load>>) {
  const white = game.white ? titledName({ ...game.white, womenTitle: "" }) : game.whiteName;
  const black = game.black ? titledName({ ...game.black, womenTitle: "" }) : game.blackName;
  return { white, black };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const game = await load(params);
  const { white, black } = names(game);
  const year = game.date?.slice(0, 4);
  const title = `${white} vs ${black}${game.event ? `, ${game.event}` : ""}${year && !game.event.includes(year) ? ` ${year}` : ""} | Chess Preparatory`;
  const result = game.result === "1/2-1/2" ? "a draw" : game.result === "1-0" ? `a win for ${white}` : game.result === "0-1" ? `a win for ${black}` : null;
  const description = [
    `${white}${game.whiteElo ? ` (${game.whiteElo})` : ""} against ${black}${game.blackElo ? ` (${game.blackElo})` : ""}`,
    [game.event, game.round && `round ${game.round}`, formatDate(game.date)].filter(Boolean).join(", "),
    game.openingName && `${game.eco ? `${game.eco} ` : ""}${game.openingName}`,
    result && `The game ended in ${result}.`,
    "Replay the moves and analyse the game with an engine.",
  ]
    .filter(Boolean)
    .join(". ")
    .replace(/\.\./g, ".");
  const canonical = gamePath(game.publicId);
  return {
    title,
    description,
    alternates: { canonical },
    // A game with no moves is a result line, not a page worth a search result.
    ...(game.plyCount === 0 && { robots: { index: false } }),
    openGraph: { title, description, url: canonical, type: "article", siteName: "Chess Preparatory", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE] },
  };
}

export default async function PublicGamePage({ params }: { params: Params }) {
  const game = await load(params);
  const { white, black } = names(game);
  const scores = scoresFromResultTag(game.result) ?? NO_SCORES;
  const pgn = buildPgn(
    {
      Event: game.event, Site: game.site, Date: game.date?.replace(/-/g, "."), Round: game.round,
      White: game.whiteName, Black: game.blackName, Result: game.result,
      WhiteElo: game.whiteElo, BlackElo: game.blackElo, ECO: game.eco, Opening: game.openingName,
    },
    game.moves,
  );
  // Back to a profile: the white player's if they have one, else black's.
  const home = game.white ?? game.black;

  return (
    <AnalysisView
      pgn={pgn}
      white={{ name: white, rating: game.whiteElo, score: scores.white, href: game.white && profilePath(game.white) }}
      black={{ name: black, rating: game.blackElo, score: scores.black, href: game.black && profilePath(game.black) }}
      result={game.result}
      title={`${white} vs ${black}`}
      details={[formatDate(game.date), game.event && `${game.event}${game.round ? ` · Round ${game.round}` : ""}`, game.openingName]}
      filename={pgnFilename(game.whiteName, game.blackName, game.date, game.result)}
      shareUrl={`${SITE_URL}${gamePath(game.publicId)}`}
      importToLichess={false}
      back={{ href: home ? profilePath(home) : "/" }}
    />
  );
}
