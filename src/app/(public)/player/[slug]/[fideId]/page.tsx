import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { GamesTable } from "@/components/games/GamesTable";
import { Pagination } from "@/components/games/Pagination";
import { PerformancePanel } from "@/components/public/profile/PerformancePanel";
import { PendingChart, PendingRows } from "@/components/public/profile/Pending";
import { ProfileRefresher } from "@/components/public/profile/ProfileRefresher";
import { RatingCard } from "@/components/public/profile/RatingCard";
import { RatingHistoryChart } from "@/components/public/profile/RatingHistoryChart";
import { federationFor } from "@/lib/federations";
import { pagedHref, pageSizeOf, rowFromPublicGame } from "@/lib/games";
import { fetchPublicPlayer, profilePath, titledName, type PublicPlayer } from "@/lib/publicPlayer";
import { series } from "@/lib/ratingSeries";
import { SHARE_IMAGE, SITE_URL } from "@/lib/site";

type Params = Promise<{ slug: string; fideId: string }>;
type SearchParams = Promise<{ page?: string; size?: string }>;

// Anything older is refreshed when someone looks: FIDE publishes monthly.
const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

const TITLE_NAMES: Record<string, string> = {
  GM: "Grandmaster", IM: "International Master", FM: "FIDE Master", CM: "Candidate Master",
  WGM: "Woman Grandmaster", WIM: "Woman International Master", WFM: "Woman FIDE Master",
  WCM: "Woman Candidate Master",
};

async function load(params: Params, searchParams?: SearchParams) {
  const { slug, fideId } = await params;
  if (!/^\d{1,20}$/.test(fideId)) notFound();
  const query = await searchParams;
  const pageParam = Number(query?.page ?? 1);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = pageSizeOf(query?.size);
  const player = await fetchPublicPlayer(fideId, page, pageSize);
  if (!player) notFound();
  return { slug, page, pageSize, player };
}

function stale(fetchedAt: string | null): boolean {
  return !fetchedAt || Date.now() - new Date(fetchedAt).getTime() > STALE_AFTER_MS;
}

/** The facts an answer engine is asked about, as one plain paragraph. */
function summary(player: PublicPlayer, country: string): string {
  const title = TITLE_NAMES[player.title] ?? TITLE_NAMES[player.womenTitle];
  const described = `${country === player.federation ? "" : `${demonym(country)} `}chess player`;
  const who = [
    // No "u": "a United States-registered", "a Ugandan" — it sounds like "you".
    `${player.fullName} is ${/^[aeio]/i.test(described) ? "an" : "a"} ${described}`,
    title ? `holding the ${title} title` : null,
    player.birthYear ? `born in ${player.birthYear}` : null,
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

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { player } = await load(params);
  const country = federationFor(player.federation).name;
  const name = titledName(player);
  const rating = player.standardRating ?? player.rapidRating ?? player.blitzRating;
  const title = `${name}${rating ? ` · FIDE ${rating}` : ""} | Chess Preparatory`;
  const description = summary(player, country);
  const canonical = profilePath(player);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "profile", siteName: "Chess Preparatory", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE] },
  };
}

export default async function PublicPlayerPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { slug, page, pageSize, player } = await load(params, searchParams);
  const canonical = profilePath(player);
  // The FIDE ID is the address; the name part is for people. A stale or
  // mistyped name redirects instead of serving a duplicate page.
  if (slug !== player.slug) permanentRedirect(pagedHref(canonical, page, pageSize));

  const fed = federationFor(player.federation);
  const needsRefresh = stale(player.historyFetchedAt) || stale(player.gamesFetchedAt);
  const history = player.ratingHistory;
  const titleName = TITLE_NAMES[player.title] ?? TITLE_NAMES[player.womenTitle];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: `${SITE_URL}${canonical}`,
      mainEntity: {
        "@type": "Person",
        name: player.fullName,
        ...(titleName && { honorificPrefix: player.title || player.womenTitle, award: titleName }),
        ...(player.birthYear && { birthDate: String(player.birthYear) }),
        nationality: { "@type": "Country", name: fed.name },
        identifier: { "@type": "PropertyValue", propertyID: "FIDE ID", value: player.fideId },
        sameAs: [`https://ratings.fide.com/profile/${player.fideId}`],
        knowsAbout: "Chess",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Players", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: fed.name },
        { "@type": "ListItem", position: 3, name: player.fullName, item: `${SITE_URL}${canonical}` },
      ],
    },
  ];

  return (
    <article className="flex flex-col gap-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-faint">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="hover:text-ink-muted">Players</Link></li>
          <li aria-hidden="true">›</li>
          <li>{fed.name}</li>
          <li aria-hidden="true">›</li>
          <li className="text-ink-muted" aria-current="page">{player.fullName}</li>
        </ol>
      </nav>

      <header className="flex flex-col gap-4">
        <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[32px] font-[480] leading-[1.15] tracking-[0.015em] sm:text-[42px]">
          {fed.flag && <span aria-hidden="true" className="text-[0.8em]">{fed.flag}</span>}
          {(player.title || player.womenTitle) && (
            <span className="text-accent">{player.title || player.womenTitle}</span>
          )}
          <span>{player.fullName}</span>
        </h1>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[15px] text-ink-muted">
          <span>{fed.name}</span>
          {player.birthYear && <span>Born {player.birthYear}</span>}
          <a
            href={`https://ratings.fide.com/profile/${player.fideId}`}
            className="tabular-nums hover:text-ink-text"
            rel="nofollow noopener"
            target="_blank"
          >
            FIDE ID {player.fideId}
          </a>
          {!player.isActive && <span className="text-ink-faint">Inactive on FIDE&apos;s list</span>}
        </p>
        <p className="max-w-[68ch] text-[16px] leading-[1.6] text-ink-muted">{summary(player, fed.name)}</p>
        {/* Unless we know there is nothing to build it from. */}
        {(player.stats.games > 0 || !player.gamesFetchedAt) && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link
              href={`/chess-bot?fide=${player.fideId}`}
              className="rounded-pill bg-accent px-5 py-2.5 text-[15px] font-[480] text-accent-on hover:bg-accent-soft"
            >
              Play {player.fullName} bot
            </Link>
            <span className="text-[14px] text-ink-faint">A bot that opens the way {player.fullName} does, from their games.</span>
          </p>
        )}
      </header>

      <ProfileRefresher
        fideId={player.fideId}
        historyFetchedAt={player.historyFetchedAt}
        gamesFetchedAt={player.gamesFetchedAt}
        needed={needsRefresh}
        queued={player.refreshStatus != null}
      />

      <section aria-label="Ratings" className="grid gap-4 md:grid-cols-3">
        <RatingCard label="Classical" rating={player.standardRating} worldRank={player.worldRankStandard}
          nationalRank={player.nationalRankStandard} country={fed.name} points={series(history, "standard")} />
        <RatingCard label="Rapid" rating={player.rapidRating} worldRank={player.worldRankRapid}
          nationalRank={player.nationalRankRapid} country={fed.name} points={series(history, "rapid")} />
        <RatingCard label="Blitz" rating={player.blitzRating} worldRank={player.worldRankBlitz}
          nationalRank={player.nationalRankBlitz} country={fed.name} points={series(history, "blitz")} />
      </section>
      <p className="-mt-6 text-right text-[12px] text-ink-faint">Ranks among active players on FIDE&apos;s latest list</p>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="flex flex-col gap-4 rounded-xl bg-ink-card p-6 sm:p-8" aria-labelledby="history-heading">
          <div>
            <h2 id="history-heading" className="text-[21px] font-[480]">Rating history</h2>
            <p className="text-[13px] text-ink-faint">Official monthly FIDE ratings</p>
          </div>
          {player.historyFetchedAt ? (
            <RatingHistoryChart history={history} />
          ) : (
            <PendingChart label="Fetching rating history from FIDE…" />
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-xl bg-ink-card p-6 sm:p-8" aria-labelledby="performance-heading">
          <div>
            <h2 id="performance-heading" className="text-[21px] font-[480]">Overall performance</h2>
            <p className="text-[13px] text-ink-faint">
              {player.stats.games
                ? `Across ${player.stats.games.toLocaleString("en")} games with recorded moves`
                : player.gamesFetchedAt
                  ? "No games with recorded moves on chess-results.com"
                  : "Calculated from this player's games once they arrive"}
            </p>
          </div>
          {player.stats.games > 0 && <PerformancePanel stats={player.stats} />}
          {!player.gamesFetchedAt && <PendingRows label="Waiting for games from chess-results.com…" rows={3} />}
        </section>
      </div>

      <section id="games" className="flex scroll-mt-24 flex-col gap-4 rounded-xl bg-ink-card p-6 sm:p-8" aria-labelledby="games-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="games-heading" className="text-[21px] font-[480]">Games</h2>
          <span className="text-[13px] tabular-nums text-ink-faint">{player.games.count.toLocaleString("en")} total</span>
        </div>
        {player.games.count > 0 ? (
          <>
            <GamesTable rows={player.games.results.map((g) => rowFromPublicGame(g, player.fideId))} />
            <Pagination count={player.games.count} page={page} pageSize={pageSize} basePath={canonical} anchor="games" />
          </>
        ) : !player.gamesFetchedAt ? (
          <PendingRows label="Fetching games from chess-results.com…" />
        ) : (
          <p className="py-8 text-center text-[14px] text-ink-faint">No games with recorded moves on chess-results.com.</p>
        )}
      </section>
    </article>
  );
}
