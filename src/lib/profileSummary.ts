/**
 * The paragraph at the top of a player profile: the facts an answer engine is
 * asked about, in plain sentences. The English one is also the page's meta
 * description, so it is built exactly as it always was; the other languages
 * get simpler sentences (no demonyms, which differ by language and gender)
 * from translatable templates. See components/public/profile/ProfileSummary.
 */
import { fill, msg, type Vars } from "@/lib/i18n";
import type { PublicPlayer } from "@/lib/publicPlayer";

export type SummaryPlayer = Pick<
  PublicPlayer,
  | "fullName" | "federation" | "title" | "womenTitle" | "isActive"
  | "standardRating" | "rapidRating" | "blitzRating" | "worldRankStandard" | "nationalRankStandard"
> & { stats: Pick<PublicPlayer["stats"], "games" | "wins" | "draws" | "losses"> };

export const TITLE_NAMES: Record<string, string> = {
  GM: msg("Grandmaster"), IM: msg("International Master"), FM: msg("FIDE Master"), CM: msg("Candidate Master"),
  WGM: msg("Woman Grandmaster"), WIM: msg("Woman International Master"), WFM: msg("Woman FIDE Master"),
  WCM: msg("Woman Candidate Master"),
};

export const titleName = (p: Pick<PublicPlayer, "title" | "womenTitle">): string | undefined =>
  TITLE_NAMES[p.title] ?? TITLE_NAMES[p.womenTitle];

/** English. `country` is the federation's English name. */
export function summary(player: SummaryPlayer, country: string): string {
  const title = titleName(player);
  const described = `${country === player.federation ? "" : `${demonym(country)} `}chess player`;
  const who = [
    // No "u": "a United States-registered", "a Ugandan" — it sounds like "you".
    `${player.fullName} is ${/^[aeio]/i.test(described) ? "an" : "a"} ${described}`,
    title ? `holding the ${title} title` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const ratings = [
    player.standardRating && rankedRating("classical", player.standardRating, player.worldRankStandard, player.nationalRankStandard, country),
    player.rapidRating && `rapid ${player.rapidRating}`,
    player.blitzRating && `blitz ${player.blitzRating}`,
  ].filter(Boolean);
  const parts = [`${who}.`];
  if (ratings.length) parts.push(`On FIDE's latest rating list their ratings are ${ratings.join(", ")}.`);
  if (player.stats.games) {
    parts.push(
      `Across ${player.stats.games} recorded games they have won ${player.stats.wins}, drawn ${player.stats.draws} and lost ${player.stats.losses}.`,
    );
  }
  if (!player.isActive) parts.push("FIDE currently lists them as inactive.");
  return parts.join(" ");
}

/** Below this, search engines call a meta description too short (Bing's
 * Webmaster Tools flags them). Most profiles are a name, a federation and one
 * rating: about 100 characters. */
export const SHORT_DESCRIPTION = 120;

/**
 * The page's meta description: the summary, and when that alone is short,
 * how long FIDE has rated them. `historyFrom` is the first month of the
 * player's rating history ("2014-03-01"), when there is one.
 */
export function metaDescription(player: SummaryPlayer, country: string, historyFrom?: string): string {
  const text = summary(player, country);
  if (text.length >= SHORT_DESCRIPTION) return text;
  // One short sentence, so the result stays under ~160 characters, where
  // search results cut a description off. A month, not a year: a player first
  // rated this month would read "since 2026", which sounds like years of it.
  const since = historyFrom && new Date(historyFrom).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const more = since ? `On FIDE's rating lists since ${since}.` : "FIDE ratings, ranks and tournament games.";
  return `${text} ${more}`;
}

function rankedRating(label: string, rating: number, world: number | null, national: number | null, country: string) {
  const ranks = [world && `world #${world.toLocaleString("en")}`, national && `#${national.toLocaleString("en")} in ${country}`]
    .filter(Boolean)
    .join(", ");
  return ranks ? `${label} ${rating} (${ranks})` : `${label} ${rating}`;
}

// "a Kenyan chess player" reads better than "a Kenya chess player", but a
// wrong demonym is worse than none; only the ones we are sure of.
const DEMONYMS: Record<string, string> = {
  Kenya: "Kenyan", Uganda: "Ugandan", Tanzania: "Tanzanian", Nigeria: "Nigerian", "South Africa": "South African",
  Norway: "Norwegian", India: "Indian", "United States of America": "American", England: "English",
  Germany: "German", France: "French", Russia: "Russian", China: "Chinese", Egypt: "Egyptian",
};
function demonym(country: string): string {
  return DEMONYMS[country] ?? `${country}-registered`;
}

/**
 * The same facts in another language. `t` translates (useT()); `country` is
 * the federation's name in that language, or "" when it has none (the code
 * stood in for it).
 */
export function translatedSummary(player: SummaryPlayer, country: string, t: (text: string, vars?: Vars) => string): string {
  const name = player.fullName;
  const title = titleName(player);
  const who = country
    ? title
      ? t(msg("{name} is a chess player from {country}, holding the {title} title."), { name, country, title: t(title) })
      : t(msg("{name} is a chess player from {country}."), { name, country })
    : title
      ? t(msg("{name} is a chess player holding the {title} title."), { name, title: t(title) })
      : t(msg("{name} is a chess player."), { name });

  const num = (n: number) => n.toLocaleString("en");
  const standardRanks = [
    player.worldRankStandard && t(msg("world #{rank}"), { rank: num(player.worldRankStandard) }),
    player.nationalRankStandard && country && t(msg("#{rank} in {country}"), { rank: num(player.nationalRankStandard), country }),
  ].filter(Boolean);
  const ratings = [
    player.standardRating &&
      fill(standardRanks.length ? "{label} ({ranks})" : "{label}", {
        label: t(msg("classical {rating}"), { rating: player.standardRating }),
        ranks: standardRanks.join(", "),
      }),
    player.rapidRating && t(msg("rapid {rating}"), { rating: player.rapidRating }),
    player.blitzRating && t(msg("blitz {rating}"), { rating: player.blitzRating }),
  ].filter(Boolean);

  const parts = [who];
  if (ratings.length) parts.push(t(msg("On FIDE's latest rating list their ratings are {ratings}."), { ratings: ratings.join(", ") }));
  const { games, wins, draws, losses } = player.stats;
  if (games) parts.push(t(msg("Across {games} recorded games they have won {wins}, drawn {draws} and lost {losses}."), { games, wins, draws, losses }));
  if (!player.isActive) parts.push(t(msg("FIDE currently lists them as inactive.")));
  return parts.join(" ");
}
