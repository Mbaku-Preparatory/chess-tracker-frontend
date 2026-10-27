import type { Metadata } from "next";
import Link from "next/link";

import { PlayerSearch } from "@/components/public/PlayerSearch";
import { profilePath } from "@/lib/publicPlayer";
import { fetchRankings, type RankingEntry } from "@/lib/rankings";
import { SHARE_IMAGE, SITE_URL } from "@/lib/site";

const TITLE = "Chess Preparatory · FIDE player ratings, history and games";
const DESCRIPTION =
  "A profile for every FIDE-rated chess player: official ratings and world and national ranks, monthly rating history, and games with results and openings.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/", type: "website", siteName: "Chess Preparatory", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] },
};

// Well-known players whose profiles are a fair first click. Canonical URLs,
// so a crawler following them gets the page, not a redirect.
const EXAMPLES = [
  { name: "Magnus Carlsen", href: "/player/magnus-carlsen/1503014" },
  { name: "Hou Yifan", href: "/player/yifan-hou/8602980" },
  { name: "Judit Polgár", href: "/player/judit-polgar/700070" },
];

const PROFILE_PARTS = [
  {
    title: "Ratings and ranks",
    body: "Classical, rapid and blitz ratings from FIDE's official list, with each player's world rank and rank in their federation.",
  },
  {
    title: "Rating history",
    body: "Every monthly FIDE list a player has appeared on, charted by time control, with the change over the last twelve months.",
  },
  {
    title: "Games and results",
    body: "Over-the-board games with moves, results and openings, and the record they add up to: overall, as white and as black.",
  },
];

const FAQ = [
  {
    q: "Where do the ratings and ranks come from?",
    a: "From FIDE's official rating list, which FIDE publishes monthly. Ranks count active players only, as FIDE's own rankings do, and tied ratings share a place.",
  },
  {
    q: "Where do the games come from?",
    a: "From chess-results.com, for games whose tournament organisers uploaded the moves. Not every rated game has moves online, so a player's game count here can be lower than the games FIDE rated.",
  },
  {
    q: "How up to date is a profile?",
    a: "Ratings and ranks update with each monthly FIDE list. Rating history and games are fetched when someone opens a profile and its data is more than 30 days old.",
  },
  {
    q: "Why can't I find a player?",
    a: "Profiles exist for every player FIDE rates in at least one time control. Players with no FIDE rating do not have one yet. Names and ratings come from FIDE, so corrections are made with FIDE.",
  },
  {
    q: "What does an account add?",
    a: "Scouting and preparation: import an opponent's games from chess-results, Chess.com and Lichess, see the openings they play and how they score with them, and plan your preparation.",
  },
];

/** The world's top ten, as links: a crawler landing here reaches profiles
 * without typing in the search box. Cached for an hour with the rankings; if
 * the API is down the section is left out rather than failing the page. */
async function topPlayers(): Promise<RankingEntry[]> {
  try {
    const { results } = await fetchRankings({ tc: "classical", list: "overall", fed: "", page: 1 });
    return results.slice(0, 10);
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const top = await topPlayers();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Chess Preparatory",
      url: SITE_URL,
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Chess Preparatory",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];

  return (
    <div className="flex flex-col gap-[72px] sm:gap-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="flex flex-col items-start gap-8 pt-10 sm:pt-20">
        <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft">Player profiles</p>
        <h1 className="max-w-[16ch] text-balance text-[42px] font-[480] leading-[1.08] tracking-[0.01em] sm:text-[65px]">
          {/* A non-breaking hyphen: a phone otherwise splits "FIDE-" from "rated". */}
          Every FIDE{"\u2011"}rated player, in one place.
        </h1>
        <p className="max-w-[56ch] text-[18px] leading-[1.5] text-ink-muted">
          Official ratings and ranks, monthly rating history, and games with results and openings, for
          every player rated by FIDE.
        </p>
        <PlayerSearch />
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-ink-faint">
          <span>For example</span>
          {EXAMPLES.map((e) => (
            <Link key={e.href} href={e.href} className="text-ink-muted underline decoration-ink-line underline-offset-4 hover:text-ink-text">
              {e.name}
            </Link>
          ))}
        </p>
      </section>

      {top.length > 0 && (
        <section aria-labelledby="top-heading" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="top-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
              World top 10
            </h2>
            <p className="flex gap-5 text-[14px]">
              <Link href="/rankings" className="text-ink-muted underline decoration-ink-line underline-offset-4 hover:text-ink-text">
                Full rankings
              </Link>
              <Link href="/rankings/countries" className="text-ink-muted underline decoration-ink-line underline-offset-4 hover:text-ink-text">
                By country
              </Link>
            </p>
          </div>
          <ol className="grid gap-x-10 rounded-xl bg-ink-card p-4 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-5 sm:p-8">
            {top.map(({ rank, rating, player }) => (
              <li key={player.fideId} className="flex items-baseline gap-3 border-b border-ink-line/60 py-3 last:border-0 sm:[&:nth-child(5)]:border-0">
                <span className="w-6 shrink-0 text-right text-[14px] tabular-nums text-ink-faint">{rank}</span>
                <Link href={profilePath(player)} className="min-w-0 flex-1 truncate text-[16px] hover:text-accent-soft">
                  {player.title && <span className="mr-1.5 text-accent">{player.title}</span>}
                  {player.fullName}
                </Link>
                <span className="shrink-0 text-[14px] tabular-nums text-ink-muted">{rating}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="profile-heading" className="flex flex-col gap-8">
        <h2 id="profile-heading" className="max-w-[24ch] text-balance text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          What a profile shows
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PROFILE_PARTS.map((part) => (
            <article key={part.title} className="flex flex-col gap-3 rounded-xl bg-ink-card p-8">
              <h3 className="text-[21px] font-[480]">{part.title}</h3>
              <p className="text-[16px] leading-[1.5] text-ink-muted">{part.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="prep-heading"
        className="grid items-center gap-8 rounded-xl bg-ink-card p-8 sm:p-12 md:grid-cols-[3fr_2fr]"
      >
        <div className="flex flex-col gap-4">
          <h2 id="prep-heading" className="text-balance text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
            Preparing for someone?
          </h2>
          <p className="max-w-[52ch] text-[16px] leading-[1.5] text-ink-muted">
            With an account, turn a profile into preparation: import your opponent&apos;s games from
            chess-results, Chess.com and Lichess, see which openings they play and how they score with
            them, and walk into the game with a plan.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <Link
            href="/signup"
            className="whitespace-nowrap rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="whitespace-nowrap rounded-pill border border-ink-text/80 px-6 py-3 text-[16px] text-ink-text hover:bg-ink-raised"
          >
            Log in
          </Link>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="flex flex-col gap-8">
        <h2 id="faq-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          Questions
        </h2>
        <dl className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="flex flex-col gap-2">
              <dt className="text-[18px] font-[480]">{q}</dt>
              <dd className="max-w-[60ch] text-[16px] leading-[1.55] text-ink-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
