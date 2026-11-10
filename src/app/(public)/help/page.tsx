import type { Metadata } from "next";
import Link from "next/link";

import { QuestionList, type Question } from "@/components/public/QuestionList";
import { ReportProblemForm } from "@/components/support/ReportProblemForm";
import { billingQuestions } from "@/lib/billingQuestions";
import { DEFAULT_ASSISTANT_QUESTIONS, DEFAULT_TRIAL_DAYS, fetchPublicPricing } from "@/lib/pricing";
import { fetchSupportContact, whatsappLink } from "@/lib/support";

const TITLE = "Help | Chess Preparatory";
const DESCRIPTION =
  "Answers about payments, refunds, imports and your account, and how to reach us: WhatsApp, email, or Report a problem from your account.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/help" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/help", type: "website", siteName: "Chess Preparatory" },
};

const LINK = "text-ink-text underline decoration-ink-line underline-offset-4 hover:text-accent-soft";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="flex scroll-mt-24 flex-col gap-8">
      <h2 id={`${id}-heading`} className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
        {title}
      </h2>
      {children}
    </section>
  );
}

const IMPORTS: Question[] = [
  {
    q: "My import is stuck",
    a: "Imports run one at a time for everyone, so yours may be waiting behind another; the import page says when it is queued. A large one (All games) can take ten minutes or more, and you can close the page: tick “Email me when it's done” and we'll tell you. If it hasn't moved in half an hour, report it below.",
  },
  {
    q: "An import found 0 games",
    a: "From chess-results, only tournaments that publish their games (PGN) have moves to import; many publish pairings only. From Chess.com or Lichess, check the period and the time controls you picked: a player who only plays blitz has no rapid games to find.",
  },
  {
    q: "“Username not found”",
    a: "Use the exact username from the player's Chess.com or Lichess profile page (it is in the address, e.g. lichess.org/@/username), not their display name.",
  },
];

function accountQuestions(assistantQuestions: number): Question[] {
  return [
    {
      q: "How do I delete my account?",
      a: (
        <>
          In <Link href="/settings" className={LINK}>Settings</Link>, at the bottom: Delete account. It deletes your
          account and everything in it straight away.
        </>
      ),
    },
    {
      q: "I want my FIDE profile off the public pages",
      a: "Email us from any address with your FIDE ID and we remove your public profile and its games, and keep them from coming back with the next rating list.",
    },
    {
      q: "How many questions can I ask Mbaku?",
      a: `Mbaku, the AI coach, answers up to ${assistantQuestions} questions a month.`,
    },
    {
      q: "How do I use a feature?",
      a: (
        <>
          Each one has a short video in the <Link href="/tutorials" className={LINK}>tutorials</Link>.
        </>
      ),
    },
  ];
}

/**
 * Help: answers first, then a person. Public, so it works signed out, for
 * someone whose access has run out, and as the support page Google Play asks
 * for. The contact details come from the backend (lib/support.ts).
 */
export default async function HelpPage() {
  const [contact, pricing] = await Promise.all([fetchSupportContact(), fetchPublicPricing("")]);
  // Said only when the backend said it: a promise is not guessed at.
  const within = contact ? ` within ${contact.replyHours} hours` : "";

  const payments: Question[] = [
    {
      q: "I paid, but my access hasn't started",
      a: (
        <>
          M-Pesa can take a minute or two. Open <Link href="/subscribe" className={LINK}>Subscribe</Link> and press
          “I&apos;ve already paid” to check again. If it still hasn&apos;t arrived after ten minutes, report it below
          with your M-Pesa confirmation code: you won&apos;t be charged twice, and nothing is lost.
        </>
      ),
    },
    ...billingQuestions(pricing?.trialDays ?? DEFAULT_TRIAL_DAYS, contact?.refundDays ?? null),
  ];

  return (
    <div className="flex flex-col gap-[72px] py-10 sm:gap-24 sm:py-16">
      <section className="flex flex-col items-start gap-6">
        <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft">Help</p>
        <h1 className="max-w-[18ch] text-balance text-[42px] font-[480] leading-[1.08] tracking-[0.01em] sm:text-[60px]">
          How can we help?
        </h1>
        <p className="max-w-[58ch] text-[18px] leading-[1.5] text-ink-muted">
          Answers to what people ask most. Still stuck?{" "}
          <a href="#contact" className={LINK}>Write to us</a>: a person replies{within}.
        </p>
      </section>

      <Section id="payments" title="Payments and your plan">
        <QuestionList questions={payments} />
      </Section>

      <Section id="imports" title="Importing games">
        <QuestionList questions={IMPORTS} />
      </Section>

      <Section id="account" title="Your account">
        <QuestionList questions={accountQuestions(pricing?.assistantMonthlyQuestions ?? DEFAULT_ASSISTANT_QUESTIONS)} />
      </Section>

      <Section id="contact" title="Still need help?">
        <p className="max-w-[60ch] text-[16px] leading-[1.55] text-ink-muted">
          A person replies{within}. For a payment, your M-Pesa confirmation code or the email you paid with lets us
          find it straight away.
        </p>
        {contact && (
          <div className="flex flex-wrap gap-3">
            {contact.whatsapp && (
              <a
                href={whatsappLink(contact.whatsapp)}
                target="_blank"
                rel="noopener"
                className="rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft"
              >
                WhatsApp us
              </a>
            )}
            <a
              href={`mailto:${contact.email}?subject=${encodeURIComponent("Chess Preparatory help")}`}
              className="rounded-pill border border-ink-text/80 px-6 py-3 text-[16px] text-ink-text hover:bg-ink-raised"
            >
              {contact.email}
            </a>
          </div>
        )}
        <div id="report" className="flex scroll-mt-24 flex-col gap-4">
          <h3 className="text-[21px] font-[480]">Report a problem</h3>
          <ReportProblemForm />
        </div>
      </Section>
    </div>
  );
}
