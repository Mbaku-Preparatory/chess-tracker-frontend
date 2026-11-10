import type { Metadata } from "next";
import Link from "next/link";

import { PricingPlans } from "@/components/public/pricing/PricingPlans";
import { QuestionList } from "@/components/public/QuestionList";
import { billingQuestions } from "@/lib/billingQuestions";
import { FREE_BOT_GAMES, FREE_PROFILE_VIEWS, PUBLIC_GAMES_SHOWN } from "@/lib/freeLimits";
import { DEFAULT_ASSISTANT_QUESTIONS, DEFAULT_TRIAL_DAYS, countryName, currencyName, fetchPublicPricing } from "@/lib/pricing";
import { SHARE_IMAGE, SITE_URL } from "@/lib/site";
import { fetchSupportContact } from "@/lib/support";

const TITLE = "Pricing | Chess Preparatory";
const DESCRIPTION =
  "One plan with everything in it: scout your opponents, prepare against their openings, play their bots and read your chess books on a board. Start with a free trial, then pay monthly or yearly by M-Pesa or card.";

// Every country's copy is the one /pricing page as far as search engines go.
export const PRICING_METADATA: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/pricing", type: "website", siteName: "Chess Preparatory", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] },
};

// What the plan includes, as the card's checklist.
function included(questions: number) {
  return [
    "Your opponents' games from chess-results, Chess.com and Lichess",
    "Their games brought up to date when you open them",
    "The openings they play with each colour, and how they score",
    "A preparation plan for each opponent",
    "Your upcoming games in one list",
    "A bot of any opponent, opening the way they do",
    "Play their bot at any strength, as often as you like",
    "Your own PDF chess books, every move on a board",
    "Exercise books turned into puzzles",
    "An engine to analyse any position",
    `Mbaku, the AI assistant: ${questions} questions a month`,
    "Everything you add, kept for as long as you have an account",
  ];
}

const ALWAYS_FREE = [
  { href: "/", label: `${FREE_PROFILE_VIEWS} player profiles, with ratings, rating history and their latest ${PUBLIC_GAMES_SHOWN} games` },
  { href: "/rankings", label: "World and national rankings" },
  { href: "/chess-bot", label: `${FREE_BOT_GAMES} games against any player's bot` },
  { href: "/chess-books", label: "The demo books in the book reader" },
  { href: "/chess-personality", label: "The chess personality test" },
];

/**
 * Prices for anyone, signed in or not: the plans for ONE country, the
 * visitor's (`country`, ISO alpha-2, "" when unknown). Server-rendered from the
 * backend's plans (lib/pricing.ts) and cached per country, so a crawler reads
 * the prices in the HTML and a visit costs no backend call. Paying happens on
 * /subscribe, which shows a signed-in user their own price.
 */
export async function PricingView({ country }: { country: string }) {
  const [pricing, contact] = await Promise.all([fetchPublicPricing(country), fetchSupportContact()]);
  // The defaults only matter when the backend could not answer, when the page
  // shows no prices anyway.
  const trialDays = pricing?.trialDays ?? DEFAULT_TRIAL_DAYS;
  const questions = pricing?.assistantMonthlyQuestions ?? DEFAULT_ASSISTANT_QUESTIONS;
  const region = pricing?.region ?? null;
  const where = countryName(country);
  const FAQ = billingQuestions(trialDays, contact?.refundDays ?? null);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
    ...(region
      ? [
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Chess Preparatory",
            description: DESCRIPTION,
            url: `${SITE_URL}/pricing`,
            brand: { "@type": "Brand", name: "Chess Preparatory" },
            offers: region.plans.map((p) => ({
              "@type": "Offer",
              name: p.period === "year" ? "Yearly" : "Monthly",
              price: p.price,
              priceCurrency: p.currency,
              url: `${SITE_URL}/pricing`,
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-[72px] sm:gap-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="flex flex-col items-start gap-6 pt-10 sm:pt-16">
        <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft">Pricing</p>
        <h1 className="max-w-[18ch] text-balance text-[42px] font-[480] leading-[1.08] tracking-[0.01em] sm:text-[60px]">
          One plan, with everything in it.
        </h1>
        <p className="max-w-[58ch] text-[18px] leading-[1.5] text-ink-muted">
          Start with {trialDays} days free, no card needed. Then pay for a month or a year at a time
          {country === "KE" ? ", by M-Pesa or card" : ", by card"}. Nothing renews by itself.
        </p>
      </section>

      {pricing === null ? (
        <p className="rounded-xl bg-ink-card p-8 text-[16px] text-ink-muted">
          The prices couldn&apos;t be loaded just now. Please try again in a few minutes.
        </p>
      ) : region === null ? (
        <p className="rounded-xl bg-ink-card p-8 text-[16px] text-ink-muted">
          Subscriptions aren&apos;t on sale just yet. Everything is free while we get ready.
        </p>
      ) : (
        <PricingPlans
          plans={region.plans}
          features={included(questions)}
          region={where ? `Prices for ${where}, in ${currencyName(region.currency)}.` : `Prices in ${currencyName(region.currency)}.`}
          trialDays={trialDays}
        />
      )}

      <section aria-labelledby="free-heading" className="flex flex-col gap-6">
        <h2 id="free-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          Free for everyone, no account needed
        </h2>
        <ul className="flex flex-col gap-3">
          {ALWAYS_FREE.map((f) => (
            <li key={f.href}>
              <Link href={f.href} className="text-[16px] text-ink-text underline decoration-ink-line underline-offset-4 hover:text-accent-soft">
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pricing-faq-heading" className="flex flex-col gap-8">
        <h2 id="pricing-faq-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          Questions
        </h2>
        <QuestionList questions={FAQ} />
      </section>
    </div>
  );
}
