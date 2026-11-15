import type { Metadata } from "next";
import Link from "next/link";

import { PricingPlans } from "@/components/public/pricing/PricingPlans";
import { T } from "@/components/T";
import { QuestionList } from "@/components/public/QuestionList";
import { billingQuestions } from "@/lib/billingQuestions";
import { FREE_BOT_GAMES, FREE_PROFILE_VIEWS, PUBLIC_GAMES_SHOWN } from "@/lib/freeLimits";
import { fill, msg } from "@/lib/i18n";
import { DEFAULT_ASSISTANT_QUESTIONS, DEFAULT_TRIAL_DAYS, fetchPublicPricing } from "@/lib/pricing";
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

// What the plan includes, as the card's checklist. {questions} is filled in where it is shown.
const INCLUDED = [
  msg("Your opponents' games from chess-results, Chess.com and Lichess"),
  msg("Their games brought up to date when you open them"),
  msg("The openings they play with each colour, and how they score"),
  msg("A preparation plan for each opponent"),
  msg("Your upcoming games in one list"),
  msg("A bot of any opponent, opening the way they do"),
  msg("Play their bot at any strength, as often as you like"),
  msg("Your own PDF chess books, every move on a board"),
  msg("Exercise books turned into puzzles"),
  msg("An engine to analyse any position"),
  msg("Mbaku, the AI assistant: {questions} questions a month"),
  msg("Everything you add, kept for as long as you have an account"),
];

const FREE_VARS = { views: FREE_PROFILE_VIEWS, games: PUBLIC_GAMES_SHOWN, botGames: FREE_BOT_GAMES };
const ALWAYS_FREE = [
  { href: "/", label: msg("{views} player profiles, with ratings, rating history and their latest {games} games") },
  { href: "/rankings", label: msg("World and national rankings") },
  { href: "/chess-bot", label: msg("{botGames} games against any player's bot") },
  { href: "/chess-books", label: msg("The demo books in the book reader") },
  { href: "/chess-personality", label: msg("The chess personality test") },
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
  const FAQ = billingQuestions(contact?.refundDays ?? null);
  const faqVars = { trialDays, refundDays: contact?.refundDays ?? "" };

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: fill(a, faqVars) } })),
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
        <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft"><T>Pricing</T></p>
        <h1 className="max-w-[18ch] text-balance text-[42px] font-[480] leading-[1.08] tracking-[0.01em] sm:text-[60px]">
          <T>One plan, with everything in it.</T>
        </h1>
        <p className="max-w-[58ch] text-[18px] leading-[1.5] text-ink-muted">
          {country === "KE" ? (
            <T vars={{ days: trialDays }}>
              {"Start with {days} days free, no card needed. Then pay for a month or a year at a time, by M-Pesa or card. Nothing renews by itself."}
            </T>
          ) : (
            <T vars={{ days: trialDays }}>
              {"Start with {days} days free, no card needed. Then pay for a month or a year at a time, by card. Nothing renews by itself."}
            </T>
          )}
        </p>
      </section>

      {pricing === null ? (
        <p className="rounded-xl bg-ink-card p-8 text-[16px] text-ink-muted">
          <T>{"The prices couldn't be loaded just now. Please try again in a few minutes."}</T>
        </p>
      ) : region === null ? (
        <p className="rounded-xl bg-ink-card p-8 text-[16px] text-ink-muted">
          <T>{"Subscriptions aren't on sale just yet. Everything is free while we get ready."}</T>
        </p>
      ) : (
        <PricingPlans
          plans={region.plans}
          features={INCLUDED}
          questions={questions}
          country={country}
          currency={region.currency}
          trialDays={trialDays}
        />
      )}

      <section aria-labelledby="free-heading" className="flex flex-col gap-6">
        <h2 id="free-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          <T>Free for everyone, no account needed</T>
        </h2>
        <ul className="flex flex-col gap-3">
          {ALWAYS_FREE.map((f) => (
            <li key={f.href}>
              <Link href={f.href} className="text-[16px] text-ink-text underline decoration-ink-line underline-offset-4 hover:text-accent-soft">
                <T vars={FREE_VARS}>{f.label}</T>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pricing-faq-heading" className="flex flex-col gap-8">
        <h2 id="pricing-faq-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          <T>Questions</T>
        </h2>
        <QuestionList questions={FAQ.map(({ q, a, id }) => ({ id, q: <T>{q}</T>, a: <T vars={faqVars}>{a}</T> }))} />
      </section>
    </div>
  );
}
