import type { Metadata } from "next";
import Link from "next/link";

import { AuthLink } from "@/components/public/AuthLink";
import { PlayerSearch } from "@/components/public/PlayerSearch";
import { PromoVideo } from "@/components/public/PromoVideo";
import { T } from "@/components/T";
import { TrialNote } from "@/components/TrialNote";
import { FREE_BOT_GAMES, FREE_PROFILE_VIEWS, PUBLIC_GAMES_SHOWN } from "@/lib/freeLimits";
import { fill, msg } from "@/lib/i18n";
import { bookPath, fetchPublicBooks } from "@/lib/publicBook";
import { profilePath } from "@/lib/publicPlayer";
import { fetchRankings, type RankingEntry } from "@/lib/rankings";
import { APP_SCHEMA, SHARE_IMAGE, SITE_URL } from "@/lib/site";

const TITLE = "Chess Preparatory · FIDE player ratings, history, games and chess books";
const DESCRIPTION =
  "A profile for every FIDE-rated chess player: official ratings and world and national ranks, monthly rating history, and games with results and openings. Plus a reader that opens any chess book PDF on a board.";

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
    title: msg("Ratings and ranks"),
    body: msg("Classical, rapid and blitz ratings from FIDE's official list, with each player's world rank and rank in their federation."),
  },
  {
    title: msg("Rating history"),
    body: msg("Every monthly FIDE list a player has appeared on, charted by time control, with the change over the last twelve months."),
  },
  {
    title: msg("Games and results"),
    body: msg("Over-the-board games with moves, results and openings, and the record they add up to: overall, as white and as black."),
  },
];

// The numbers in the FAQ answers, filled in where the answers are shown.
const FAQ_VARS = { views: FREE_PROFILE_VIEWS, games: PUBLIC_GAMES_SHOWN, botGames: FREE_BOT_GAMES };

const FAQ = [
  {
    q: msg("Where do the ratings and ranks come from?"),
    a: msg("From FIDE's official rating list, which FIDE publishes monthly. Ranks count active players only, as FIDE's own rankings do, and tied ratings share a place."),
  },
  {
    q: msg("Where do the games come from?"),
    a: msg("From chess-results.com, for games whose tournament organisers uploaded the moves. Not every rated game has moves online, so a player's game count here can be lower than the games FIDE rated."),
  },
  {
    q: msg("How up to date is a profile?"),
    a: msg("Ratings and ranks update with each monthly FIDE list. Rating history and games are fetched when someone opens a profile and its data is more than 30 days old."),
  },
  {
    q: msg("Why can't I find a player?"),
    a: msg("Profiles exist for every player FIDE rates in at least one time control. Players with no FIDE rating do not have one yet. Names and ratings come from FIDE, so corrections are made with FIDE."),
  },
  {
    q: msg("What does an account add?"),
    a: msg("Scouting and preparation: import an opponent's games from chess-results, Chess.com and Lichess, see the openings they play and how they score with them, and plan your preparation, with every game a player has. And your chess books: upload a PDF and read it with a board, or solve its exercises. Without an account you can open {views} player profiles and see each one's latest {games} games."),
  },
  {
    q: msg("Can I play a bot of a real chess player?"),
    a: msg("Yes. Search any FIDE-rated player and play a bot built from their tournament games: it opens the way they do, move for move, then plays at the strength you choose. The first {botGames} games are free, without an account."),
  },
  {
    q: msg("Can I read a chess book here?"),
    a: msg("Yes. Upload a chess book as a PDF, scans included, and every move and diagram in it opens on a board beside the page. A book of exercises becomes puzzles to solve. The book stays on your device; the server keeps only where the moves are. Demo books are free to read without an account."),
  },
];

const BOOK_PARTS = [
  {
    title: msg("Every move on the board"),
    body: msg("Upload a chess book as a PDF, scans included. Each move and diagram the reader finds lights up on the page: tap it and the board shows the position; arrows walk the line."),
  },
  {
    title: msg("Exercises become puzzles"),
    body: msg("A book typeset in a chess font comes out as its exercises: each diagram as a position to solve, your move checked against the book's, and its notes once you have it."),
  },
  {
    title: msg("Your book stays yours"),
    body: msg("The file is read once, for where its moves and diagrams sit, and deleted. The reader draws your own copy, kept in your browser. Nobody else sees your books."),
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

const FUN = [
  {
    href: "/chess-personality",
    eyebrow: msg("Chess personality test"),
    title: msg("What kind of chess player are you?"),
    body: msg("Twenty quick questions, then your chess personality, your four sliders and the famous player who plays like you."),
    cta: msg("Take the test"),
  },
];

export default async function LandingPage() {
  const [top, books] = await Promise.all([topPlayers(), fetchPublicBooks()]);
  const demo = books[0] ?? null;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Chess Preparatory",
      url: SITE_URL,
    },
    {
      ...APP_SCHEMA,
      featureList: [
        "FIDE player profiles with ratings, ranks, rating history and games",
        "World and national rankings",
        "Opponent scouting and preparation",
        "A chess book reader: every move and diagram of a PDF opens on a board",
        "Exercise books converted to puzzles to solve",
      ],
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
        acceptedAnswer: { "@type": "Answer", text: fill(a, FAQ_VARS) },
      })),
    },
  ];

  return (
    <div className="flex flex-col gap-[72px] sm:gap-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Text and video side by side on a wide screen; narrower, the video comes
          first. The text stays first in the HTML for readers and crawlers. */}
      <section className="grid grid-cols-1 items-center gap-10 pt-6 sm:pt-16 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col items-start gap-8">
          <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft"><T>Player profiles</T></p>
          <h1 className="max-w-[16ch] text-balance text-[42px] font-[480] leading-[1.08] tracking-[0.01em] sm:text-[65px]">
            {/* A non-breaking hyphen: a phone otherwise splits "FIDE-" from "rated". */}
            <T>{"Every FIDE\u2011rated player, in one place."}</T>
          </h1>
          <p className="max-w-[56ch] text-[18px] leading-[1.5] text-ink-muted">
            <T>
              Official ratings and ranks, monthly rating history, and games with results and openings, for
              every player rated by FIDE. And a reader that opens any chess book on a board.
            </T>
          </p>
          <PlayerSearch />
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-ink-faint">
            <span><T>For example</T></span>
            {EXAMPLES.map((e) => (
              <Link key={e.href} href={e.href} className="text-ink-muted underline decoration-ink-line underline-offset-4 hover:text-ink-text">
                {e.name}
              </Link>
            ))}
          </p>
        </div>
        <PromoVideo className="order-first mx-auto max-w-[560px] lg:order-none lg:max-w-none" />
      </section>

      {top.length > 0 && (
        <section aria-labelledby="top-heading" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="top-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
              <T>World top 10</T>
            </h2>
            <p className="flex gap-5 text-[14px]">
              <Link href="/rankings" className="text-ink-muted underline decoration-ink-line underline-offset-4 hover:text-ink-text">
                <T>Full rankings</T>
              </Link>
              <Link href="/rankings/countries" className="text-ink-muted underline decoration-ink-line underline-offset-4 hover:text-ink-text">
                <T>By country</T>
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

      <section aria-labelledby="fun-heading" className="flex flex-col gap-8">
        <h2 id="fun-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          <T>Just for fun</T>
        </h2>
        <div className="grid gap-4">
          {FUN.map((f) => (
            <article key={f.href} className="flex flex-col items-start gap-4 rounded-xl bg-ink-card p-8">
              <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft"><T>{f.eyebrow}</T></p>
              <h3 className="text-balance text-[24px] font-[480] leading-[1.2]"><T>{f.title}</T></h3>
              <p className="max-w-[48ch] text-[16px] leading-[1.5] text-ink-muted"><T>{f.body}</T></p>
              <Link href={f.href} className="mt-auto rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft">
                <T>{f.cta}</T>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="profile-heading" className="flex flex-col gap-8">
        <h2 id="profile-heading" className="max-w-[24ch] text-balance text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          <T>What a profile shows</T>
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PROFILE_PARTS.map((part) => (
            <article key={part.title} className="flex flex-col gap-3 rounded-xl bg-ink-card p-8">
              <h3 className="text-[21px] font-[480]"><T>{part.title}</T></h3>
              <p className="text-[16px] leading-[1.5] text-ink-muted"><T>{part.body}</T></p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="bot-heading" className="grid items-center gap-8 rounded-xl bg-ink-card p-8 sm:p-12 md:grid-cols-[3fr_2fr]">
        <div className="flex flex-col items-start gap-4">
          <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft"><T>Create your own bot</T></p>
          <h2 id="bot-heading" className="max-w-[22ch] text-balance text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
            <T>Play a bot of any player, built from their games</T>
          </h2>
          <p className="max-w-[56ch] text-[16px] leading-[1.5] text-ink-muted">
            <T>
              Pick a player. The bot plays their openings, move for move from their tournament games, then plays at the strength you choose.
              Rehearse against your next opponent before you meet them.
            </T>
          </p>
        </div>
        <div className="flex md:justify-end">
          <Link href="/chess-bot" className="rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft">
            <T>Create your bot</T>
          </Link>
        </div>
      </section>

      <section aria-labelledby="books-heading" className="flex flex-col gap-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="books-heading" className="max-w-[24ch] text-balance text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
            <T>Read chess books with a board</T>
          </h2>
          <p className="flex gap-5 text-[14px]">
            <Link href="/chess-books" className="text-ink-muted underline decoration-ink-line underline-offset-4 hover:text-ink-text">
              <T>How it works</T>
            </Link>
            {demo && (
              <Link href={bookPath(demo.publicSlug)} className="text-ink-muted underline decoration-ink-line underline-offset-4 hover:text-ink-text">
                <T vars={{ title: demo.title }}>{"Try it on {title}"}</T>
              </Link>
            )}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {BOOK_PARTS.map((part) => (
            <article key={part.title} className="flex flex-col gap-3 rounded-xl bg-ink-card p-8">
              <h3 className="text-[21px] font-[480]"><T>{part.title}</T></h3>
              <p className="text-[16px] leading-[1.5] text-ink-muted"><T>{part.body}</T></p>
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
            <T>Preparing for someone?</T>
          </h2>
          <p className="max-w-[52ch] text-[16px] leading-[1.5] text-ink-muted">
            <T>
              {"With an account, turn a profile into preparation: import your opponent's games from chess-results, Chess.com and Lichess, see which openings they play and how they score with them, and walk into the game with a plan."}
            </T>
          </p>
          <TrialNote className="text-[14px] text-ink-faint" />
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <AuthLink
            href="/signup"
            className="whitespace-nowrap rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft"
          >
            <T>Get started</T>
          </AuthLink>
          <AuthLink
            href="/login"
            className="whitespace-nowrap rounded-pill border border-ink-text/80 px-6 py-3 text-[16px] text-ink-text hover:bg-ink-raised"
          >
            <T>Log in</T>
          </AuthLink>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="flex flex-col gap-8">
        <h2 id="faq-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          <T>Questions</T>
        </h2>
        <dl className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="flex flex-col gap-2">
              <dt className="text-[18px] font-[480]"><T>{q}</T></dt>
              <dd className="max-w-[60ch] text-[16px] leading-[1.55] text-ink-muted"><T vars={FAQ_VARS}>{a}</T></dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
