import type { Metadata } from "next";

import { PublicBot } from "@/components/public/bot/PublicBot";
import { T } from "@/components/T";
import { FREE_BOT_GAMES } from "@/lib/freeLimits";
import { SHARE_IMAGE, SITE_URL } from "@/lib/site";
import { fill, msg } from "@/lib/i18n";

const TITLE = "Create your own chess bot from any player's games | Chess Preparatory";
const DESCRIPTION =
  `Search any FIDE-rated chess player and play a bot built from their tournament games: it opens the way they do, move for move, then plays at the strength you choose. Free, in your browser, no account needed for your first ${FREE_BOT_GAMES} games.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // One page, whichever player a link pre-selects.
  alternates: { canonical: "/chess-bot" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/chess-bot", type: "website", siteName: "Chess Preparatory", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] },
};

const STEPS = [
  {
    title: msg("Search a player"),
    body: msg("Any of the 790,000 players on FIDE's rating list, by name or FIDE ID: a world champion, your club's strongest player, or the opponent you meet next round."),
  },
  {
    title: msg("We find their games"),
    body: msg("Their over-the-board tournament games, from chess-results.com. The bot learns which moves they chose in each position, and how often, with recent games counting most."),
  },
  {
    title: msg("Play their bot"),
    body: msg("Pick your colour and the bot's strength. For the first ten moves it plays their own moves, and tells you when you have left their games; after that a chess engine plays at the strength you chose."),
  },
];

// The number in the FAQ answers, filled in where they are shown.
const VARS = { botGames: FREE_BOT_GAMES };

const FAQ = [
  {
    q: msg("What is a chess bot of a player?"),
    a: msg("A computer opponent that plays the openings a real player plays. Chess Preparatory builds it from that player's published tournament games: in each position it plays one of the moves they chose there, weighted by how often and how recently they played it."),
  },
  {
    q: msg("Which players can I make a bot of?"),
    a: msg("Any FIDE-rated player whose tournament games with moves are on chess-results.com. That covers most players who play rated events where organisers upload the games. If a player has no games with moves, there is nothing to build a bot from, and the page says so."),
  },
  {
    q: msg("Does the bot play exactly like the player?"),
    a: msg("In the opening, yes: for up to ten moves it plays only moves the player actually played, and it says when one of their games went the same way. Once the game leaves their games, or after ten moves, a chess engine (Stockfish) takes over at the strength you chose, so the middlegame is the engine's, not the player's."),
  },
  {
    q: msg("How strong is the bot?"),
    a: msg("You choose, from 1320 to 2900. It starts at the player's FIDE rating. The engine cannot play weaker than 1320, so a bot of a lower-rated player plays at 1320 after the opening."),
  },
  {
    q: msg("Is it free?"),
    a: msg("Your first {botGames} games are free, with no account. After that, an account starts with a free trial: keep playing, and build bots of the opponents you scout in the app, with their full opening tree and preparation tools. When the trial ends, a small subscription keeps it going."),
  },
  {
    q: msg("Can I use it to prepare for a real game?"),
    a: msg("That is what it is for. Play the bot of your next opponent to rehearse the openings they actually play, find out where their games stop, and practise the positions you are likely to reach."),
  },
];

/**
 * "Create your own bot", for anyone: the landing page search engines and
 * answer engines read, with the bot itself in it. The text and the
 * structured data are what a crawler sees; the bot runs in the browser.
 */
export default async function ChessBotPage({ searchParams }: { searchParams: Promise<{ fide?: string }> }) {
  const { fide } = await searchParams;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Create your own chess bot",
      url: `${SITE_URL}/chess-bot`,
      description: DESCRIPTION,
      applicationCategory: "GameApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      provider: { "@type": "Organization", name: "Chess Preparatory", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to play a chess bot of any player",
      step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.body })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: fill(a, VARS) } })),
    },
  ];

  return (
    <div className="flex flex-col gap-[72px] sm:gap-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="flex flex-col gap-8 pt-10 sm:pt-16">
        <div className="flex flex-col items-start gap-6">
          <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft"><T>{"Create your own bot"}</T></p>
          <h1 className="max-w-[20ch] text-balance text-[42px] font-[480] leading-[1.08] tracking-[0.01em] sm:text-[60px]">
            <T>{"Play a chess bot of any player."}</T>
          </h1>
          <p className="max-w-[58ch] text-[18px] leading-[1.5] text-ink-muted">
            <T vars={VARS}>
              {"Search any FIDE-rated player. We find their tournament games and build a bot that opens the way they do, move for move, then plays at the strength you choose. Your first {botGames} games are free, no account needed."}
            </T>
          </p>
        </div>
        <PublicBot initialFideId={fide} />
      </section>

      <section aria-labelledby="bot-how-heading" className="flex flex-col gap-8">
        <h2 id="bot-how-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          <T>{"How it works"}</T>
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3 rounded-xl bg-ink-card p-8">
              <span className="text-[14px] tabular-nums text-accent-soft"><T vars={{ n: i + 1 }}>{"Step {n}"}</T></span>
              <h3 className="text-[21px] font-[480]"><T>{s.title}</T></h3>
              <p className="text-[16px] leading-[1.5] text-ink-muted"><T>{s.body}</T></p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="bot-faq-heading" className="flex flex-col gap-8">
        <h2 id="bot-faq-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          <T>{"Questions"}</T>
        </h2>
        <dl className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="flex flex-col gap-2">
              <dt className="text-[18px] font-[480]"><T>{q}</T></dt>
              <dd className="max-w-[60ch] text-[16px] leading-[1.55] text-ink-muted"><T vars={VARS}>{a}</T></dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
