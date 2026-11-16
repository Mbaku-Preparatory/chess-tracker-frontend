import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { Country } from "@/components/Country";
import { AdSlot } from "@/components/public/AdSlot";
import { PerformancePanel } from "@/components/public/profile/PerformancePanel";
import { ProfileMeter } from "@/components/public/profile/ProfileMeter";
import { PublicGames } from "@/components/public/profile/PublicGames";
import { PendingGames } from "@/components/public/profile/Pending";
import { ProfileRefresher } from "@/components/public/profile/ProfileRefresher";
import { ProfileSummary } from "@/components/public/profile/ProfileSummary";
import { RatingCard } from "@/components/public/profile/RatingCard";
import { RatingHistoryChart } from "@/components/public/profile/RatingHistoryChart";
import { T } from "@/components/T";
import { federationFor } from "@/lib/federations";
import { PUBLIC_GAMES_SHOWN } from "@/lib/freeLimits";
import { msg } from "@/lib/i18n";
import { preparePath } from "@/lib/prepare";
import { metaDescription, titleName, type SummaryPlayer } from "@/lib/profileSummary";
import { fetchPublicPlayer, profilePath, titledName, type PublicPlayer } from "@/lib/publicPlayer";
import { series } from "@/lib/ratingSeries";
import { SHARE_IMAGE, SITE_URL } from "@/lib/site";

type Params = Promise<{ slug: string; fideId: string }>;

/**
 * Each profile is rendered on its first visit, then kept and served from the
 * CDN (PROFILE_REVALIDATE). None are built ahead: there are ~450k. Nothing in
 * the render may depend on the request (search params, cookies, the clock), or
 * every visit is a fresh render again; ?page=&size= is read in the browser.
 */
export function generateStaticParams() {
  return [];
}

async function load(params: Params) {
  const { slug, fideId } = await params;
  if (!/^\d{1,20}$/.test(fideId)) notFound();
  // The most recent games, all a profile shows without an account (lib/freeLimits.ts).
  const player = await fetchPublicPlayer(fideId, 1, PUBLIC_GAMES_SHOWN);
  if (!player) notFound();
  return { slug, player };
}

/** Only what the summary reads, so the page does not send the whole player to the browser twice. */
function summaryOf(p: PublicPlayer): SummaryPlayer {
  const { fullName, federation, title, womenTitle, isActive, standardRating, rapidRating, blitzRating, worldRankStandard, nationalRankStandard } = p;
  const { games, wins, draws, losses } = p.stats;
  return { fullName, federation, title, womenTitle, isActive, standardRating, rapidRating, blitzRating, worldRankStandard, nationalRankStandard, stats: { games, wins, draws, losses } };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { player } = await load(params);
  const country = federationFor(player.federation).name;
  const name = titledName(player);
  const rating = player.standardRating ?? player.rapidRating ?? player.blitzRating;
  const title = `${name}${rating ? ` · FIDE ${rating}` : ""} | Chess Preparatory`;
  const description = metaDescription(player, country, player.ratingHistory[0]?.month);
  const canonical = profilePath(player);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "profile", siteName: "Chess Preparatory", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE] },
  };
}

export default async function PublicPlayerPage({ params }: { params: Params }) {
  const { slug, player } = await load(params);
  const canonical = profilePath(player);
  // The FIDE ID is the address; the name part is for people. A stale or
  // mistyped name redirects instead of serving a duplicate page.
  if (slug !== player.slug) permanentRedirect(canonical);

  const fed = federationFor(player.federation);
  const history = player.ratingHistory;
  const award = titleName(player);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: `${SITE_URL}${canonical}`,
      mainEntity: {
        "@type": "Person",
        name: player.fullName,
        ...(award && { honorificPrefix: player.title || player.womenTitle, award }),
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
          <li><Link href="/" className="hover:text-ink-muted"><T>Players</T></Link></li>
          <li aria-hidden="true">›</li>
          <li><Country code={player.federation} /></li>
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
          <span><Country code={player.federation} /></span>
          <a
            href={`https://ratings.fide.com/profile/${player.fideId}`}
            className="tabular-nums hover:text-ink-text"
            rel="nofollow noopener"
            target="_blank"
          >
            <T vars={{ id: player.fideId }}>{"FIDE ID {id}"}</T>
          </a>
          {!player.isActive && <span className="text-ink-faint"><T>{"Inactive on FIDE's list"}</T></span>}
        </p>
        <ProfileSummary player={summaryOf(player)} className="max-w-[68ch] text-[16px] leading-[1.6] text-ink-muted" />
        {/* Unless we know there is nothing to build it from. */}
        {(player.stats.games > 0 || !player.gamesFetchedAt) && (
          <div className="space-y-2">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* The offer this page exists to make: most visitors are about to
                  play this person. Same tab: it ends on their page in the app. */}
              <Link
                href={preparePath({ fideId: player.fideId, fullName: player.fullName, federation: player.federation })}
                className="rounded-pill bg-accent px-5 py-2.5 text-[15px] font-[480] text-accent-on hover:bg-accent-soft"
              >
                <T vars={{ name: player.fullName }}>{"Prepare against {name}"}</T>
              </Link>
              <Link
                href={`/chess-bot?fide=${player.fideId}`}
                className="rounded-pill border border-ink-text/80 px-5 py-2.5 text-[15px] text-ink-text hover:bg-ink-raised"
              >
                <T vars={{ name: player.fullName }}>{"Play {name} bot"}</T>
              </Link>
            </p>
            <p className="max-w-[68ch] text-[14px] text-ink-faint">
              <T vars={{ name: player.fullName }}>
                {"Prepare: their openings with each colour, results and full games, kept in your account. The bot opens the way {name} does, from their games."}
              </T>
            </p>
          </div>
        )}
      </header>

      <ProfileMeter player={{ fideId: player.fideId, fullName: player.fullName, federation: player.federation }} />

      <ProfileRefresher
        fideId={player.fideId}

        gamesFetchedAt={player.gamesFetchedAt}
        queued={player.refreshStatus != null}
      />

      <section aria-label="Ratings" className="grid gap-4 md:grid-cols-3">
        <RatingCard label={msg("Classical")} rating={player.standardRating} worldRank={player.worldRankStandard}
          nationalRank={player.nationalRankStandard} federation={player.federation} points={series(history, "standard")} />
        <RatingCard label={msg("Rapid")} rating={player.rapidRating} worldRank={player.worldRankRapid}
          nationalRank={player.nationalRankRapid} federation={player.federation} points={series(history, "rapid")} />
        <RatingCard label={msg("Blitz")} rating={player.blitzRating} worldRank={player.worldRankBlitz}
          nationalRank={player.nationalRankBlitz} federation={player.federation} points={series(history, "blitz")} />
      </section>
      <p className="-mt-6 text-right text-[12px] text-ink-faint"><T>{"Ranks among active players on FIDE's latest list"}</T></p>

      {/* Under the ratings, where most visitors look. Founder's call
          (2026-11-11): visitors without an account can have ads high up;
          account holders never see one. */}
      <AdSlot />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="flex flex-col gap-4 rounded-xl bg-ink-card p-6 sm:p-8" aria-labelledby="history-heading">
          <div>
            <h2 id="history-heading" className="text-[21px] font-[480]"><T>Rating history</T></h2>
            <p className="text-[13px] text-ink-faint"><T>Official monthly FIDE ratings</T></p>
          </div>
          {/* From FIDE's rating lists, which every import stores: never pending. */}
          <RatingHistoryChart history={history} />
        </section>

        <section className="flex flex-col gap-4 rounded-xl bg-ink-card p-6 sm:p-8" aria-labelledby="performance-heading">
          <div>
            <h2 id="performance-heading" className="text-[21px] font-[480]"><T>Overall performance</T></h2>
            <p className="text-[13px] text-ink-faint">
              {player.stats.games ? (
                <T n={player.stats.games} vars={{ n: player.stats.games.toLocaleString("en") }} one="Across {n} game with recorded moves">
                  {"Across {n} games with recorded moves"}
                </T>
              ) : player.gamesFetchedAt ? (
                <T>No games with recorded moves on chess-results.com</T>
              ) : (
                <T>{"Calculated from this player's games once they arrive"}</T>
              )}
            </p>
          </div>
          {player.stats.games > 0 && <PerformancePanel stats={player.stats} />}
          {!player.gamesFetchedAt && <PendingGames rows={3} />}
        </section>
      </div>

      <section id="games" className="flex scroll-mt-24 flex-col gap-4 rounded-xl bg-ink-card p-6 sm:p-8" aria-labelledby="games-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="games-heading" className="text-[21px] font-[480]"><T>Games</T></h2>
          <span className="text-[13px] tabular-nums text-ink-faint">
            <T vars={{ n: player.games.count.toLocaleString("en") }}>{"{n} total"}</T>
          </span>
        </div>
        {player.games.count > 0 ? (
          <PublicGames
            player={{ fideId: player.fideId, fullName: player.fullName, federation: player.federation }}
            games={player.games.results}
            count={player.games.count}
          />
        ) : !player.gamesFetchedAt ? (
          <PendingGames />
        ) : (
          <p className="py-8 text-center text-[14px] text-ink-faint"><T>No games with recorded moves on chess-results.com.</T></p>
        )}
      </section>
    </article>
  );
}
