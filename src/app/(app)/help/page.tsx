import type { Metadata } from "next";
import Link from "next/link";

import { QuestionList, type Question } from "@/components/public/QuestionList";
import { ReportProblemForm } from "@/components/support/ReportProblemForm";
import { billingQuestions } from "@/lib/billingQuestions";
import { DEFAULT_ASSISTANT_QUESTIONS, DEFAULT_TRIAL_DAYS, fetchPublicPricing } from "@/lib/pricing";
import { fetchSupportContact, whatsappLink } from "@/lib/support";

// Signed-in only (founder, 2026-11-14), so not for search engines either.
export const metadata: Metadata = {
  title: "Help | Chess Preparatory",
  robots: { index: false, follow: false },
};

const LINK = "font-medium text-brand-600 hover:underline dark:text-brand-400";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="card scroll-mt-24 p-6">
      <h2 id={`${id}-heading`} className="mb-5 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

const IMPORTS: Question[] = [
  {
    q: "My import is stuck",
    a: "Imports run one at a time for everyone, so yours may be waiting behind another; the import page says when it is queued. A large one (All games) can take ten minutes or more, and you can close the page: tick “Email me when it's done” and we'll tell you. If it hasn't moved in half an hour, send us a message above.",
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
 * Help, inside the signed-in app: the message form first (laid out like
 * Bomahut's), then the email and WhatsApp, then answers to what people ask
 * most. Reachable after access has run out (lib/subscription.ts,
 * isOpenWithoutAccess). The contact details come from the backend
 * (lib/support.ts).
 */
export default async function HelpPage() {
  const [contact, pricing] = await Promise.all([fetchSupportContact(), fetchPublicPricing("")]);

  const payments: Question[] = [
    {
      q: "I paid, but my access hasn't started",
      a: (
        <>
          A payment can take a minute or two to arrive. Open <Link href="/subscribe" className={LINK}>Subscribe</Link>{" "}
          and press “I&apos;ve already paid” to check again. If it still hasn&apos;t arrived after ten minutes, send us
          a message above with the reference on your payment receipt: you won&apos;t be charged twice, and nothing is
          lost.
        </>
      ),
    },
    ...billingQuestions(pricing?.trialDays ?? DEFAULT_TRIAL_DAYS, contact?.refundDays ?? null),
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Help</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Send us a message, or find your answer below.</p>
      </div>

      <section className="card p-6">
        <ReportProblemForm replyHours={contact?.replyHours ?? null} />
        {contact && (
          <div className="mt-6 flex flex-col gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Or reach us directly. For a payment, the reference on your receipt or the email you paid with lets us find
              it straight away.
            </p>
            <div className="flex flex-wrap gap-3">
              {contact.whatsapp && (
                <a href={whatsappLink(contact.whatsapp)} target="_blank" rel="noopener" className="btn-primary">
                  WhatsApp us
                </a>
              )}
              <a href={`mailto:${contact.email}?subject=${encodeURIComponent("Chess Preparatory help")}`} className="btn-secondary">
                {contact.email}
              </a>
            </div>
          </div>
        )}
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
    </div>
  );
}
