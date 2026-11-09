import type { Metadata } from "next";
import Link from "next/link";

import { PricingCta } from "@/components/public/pricing/PricingCta";
import { countryName, currencyName, fetchPublicPricing, type PublicPlan } from "@/lib/pricing";
import { SHARE_IMAGE, SITE_URL } from "@/lib/site";
import { annualSaving, formatPrice, perMonthOfAnnual } from "@/lib/subscription";

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

function included(questions: number) {
  return [
    {
      title: "Scout any opponent",
      body: "Their games from chess-results, Chess.com and Lichess in one place, brought up to date when you open them.",
    },
    { title: "Know their openings", body: "Which openings they play with each colour, and how they score with them." },
    { title: "Prepare for the game", body: "A plan for each opponent, and your upcoming games in one list." },
    { title: "Play their bot", body: "A bot built from any opponent's games that opens the way they do, at the strength you choose." },
    { title: "Your books on a board", body: "Every move and diagram of your own PDF chess books on a board. Exercise books become puzzles." },
    { title: "Ask Mbaku", body: `An AI assistant that answers questions about a player's games: ${questions} questions a month.` },
  ];
}

const ALWAYS_FREE = [
  { href: "/", label: "Every FIDE-rated player's profile, ratings and rating history" },
  { href: "/rankings", label: "World and national rankings" },
  { href: "/chess-bot", label: "Your first game against any player's bot" },
  { href: "/chess-books", label: "The demo books in the book reader" },
  { href: "/guess-the-player", label: "Guess the player and the chess personality test" },
];

function faq(trialDays: number) {
  return [
    {
      q: "How does the free trial work?",
      a: `Every new account gets ${trialDays} days of everything, free. There is no card to enter and nothing to cancel: when the trial ends, you choose whether to pay.`,
    },
    {
      q: "Does it renew automatically?",
      a: "No. You pay for a month or a year at a time, and nothing is charged again without you. We email you before your time runs out.",
    },
    {
      q: "How do I pay?",
      a: "In Kenya, by M-Pesa or card. Everywhere else, by debit or credit card. Payments are handled by Paystack, so your card details never reach us.",
    },
    {
      q: "Why this price?",
      a: "Prices are set by country, and this page shows the price for the country you are browsing from. The price you pay is confirmed when you subscribe, and after your first payment it follows the country of the card or M-Pesa account you paid with.",
    },
    {
      q: "What happens when my time runs out?",
      a: "Everything you added stays saved: your players, games, prep and books. Your account, settings and the public pages stay open. Pay again and it is all back the moment the payment goes through.",
    },
    {
      q: "Can I pay before my time runs out?",
      a: "Yes. Paying early adds the new month or year on after the time you already have, so nothing is lost.",
    },
  ];
}

function PlanCard({ plan, plans, trialDays }: { plan: PublicPlan; plans: PublicPlan[]; trialDays: number }) {
  const annual = plan.period === "year";
  const monthly = plans.find((p) => p.period === "month");
  const pct = annual && monthly ? annualSaving(monthly.price, plan.price) : null;
  return (
    <div className={`flex flex-col gap-4 rounded-xl bg-ink-card p-8 ${annual ? "ring-1 ring-accent" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[21px] font-[480]">{annual ? "Yearly" : "Monthly"}</h3>
        {pct !== null && (
          <span className="rounded-pill bg-accent/15 px-3 py-1 text-[13px] font-[480] text-accent-soft">Save {pct}%</span>
        )}
      </div>
      <p className="flex items-baseline gap-2">
        <span className="text-[42px] font-[480] leading-none tabular-nums">{formatPrice(plan.price, plan.currency)}</span>
        <span className="text-[16px] text-ink-muted">/ {annual ? "year" : "month"}</span>
      </p>
      <p className="min-h-[1.5em] text-[15px] text-ink-muted">
        {annual ? `That's ${perMonthOfAnnual(plan.price, plan.currency)} a month.` : "Pay a month at a time."}
      </p>
      <div className="mt-auto flex flex-col gap-2 pt-2">
        <PricingCta primary={annual} />
        <p className="text-center text-[13px] text-ink-faint">{trialDays} days free first. No card needed.</p>
      </div>
    </div>
  );
}

/**
 * Prices for anyone, signed in or not: the plans for ONE country, the
 * visitor's (`country`, ISO alpha-2, "" when unknown). Server-rendered from the
 * backend's plans (lib/pricing.ts) and cached per country, so a crawler reads
 * the prices in the HTML and a visit costs no backend call. Paying happens on
 * /subscribe, which shows a signed-in user their own price.
 */
export async function PricingView({ country }: { country: string }) {
  const pricing = await fetchPublicPricing(country);
  // The defaults only matter when the backend could not answer, when the page
  // shows no prices anyway.
  const trialDays = pricing?.trialDays ?? 14;
  const questions = pricing?.assistantMonthlyQuestions ?? 20;
  const region = pricing?.region ?? null;
  const where = countryName(country);
  const FAQ = faq(trialDays);

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
        <section aria-labelledby="prices-heading" className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h2 id="prices-heading" className="text-[24px] font-[480] leading-[1.2]">
              {where ? `Prices for ${where}` : "Prices"}
            </h2>
            <p className="text-[15px] text-ink-muted">In {currencyName(region.currency)}.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {region.plans.map((plan) => (
              <PlanCard key={`${plan.period}-${plan.days}`} plan={plan} plans={region.plans} trialDays={trialDays} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="included-heading" className="flex flex-col gap-8">
        <h2 id="included-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          What you get
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {included(questions).map((f) => (
            <li key={f.title} className="flex flex-col gap-2 rounded-xl bg-ink-card p-8">
              <h3 className="text-[19px] font-[480]">{f.title}</h3>
              <p className="text-[16px] leading-[1.5] text-ink-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

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
