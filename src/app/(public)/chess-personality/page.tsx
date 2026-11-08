import type { Metadata } from "next";
import Link from "next/link";

import { TypeGrid } from "@/components/public/personality/TypeGrid";
import { QUESTIONS, TYPES } from "@/lib/chessPersonality";

const TITLE = "Chess personality test: what kind of chess player are you?";
const DESCRIPTION = `Answer ${QUESTIONS.length} quick questions and find out which of ${TYPES.length} chess personalities you are, and which famous player plays like you.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/chess-personality" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/chess-personality", type: "website", siteName: "Chess Preparatory" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const PROMISES = [
  { title: "Your chess personality", body: `One of ${TYPES.length}, from the Firestarter to the Architect.` },
  { title: "A player like you", body: "The grandmaster or streamer who plays the way you do." },
  { title: "Your four sliders", body: "Speed or depth, attack or control, gambler or guardian, fire or ice." },
];

/**
 * The test's front page. Just for fun: the whole test runs in the browser,
 * there is nothing to sign up for, and nothing here points anywhere else.
 */
export default function ChessPersonalityPage() {
  return (
    <div className="flex flex-col gap-[72px] sm:gap-24">
      <section className="flex flex-col items-center gap-7 pt-8 text-center sm:pt-16">
        <p className="text-[13px] uppercase tracking-[0.12em] text-accent-soft">Chess personality test</p>
        <h1 className="max-w-[18ch] text-balance text-[42px] font-[480] leading-[1.08] tracking-[0.01em] sm:text-[62px]">
          What kind of chess player are you?
        </h1>
        <p className="max-w-[52ch] text-[18px] leading-[1.5] text-ink-muted">
          {QUESTIONS.length} quick questions, two answers each. About two minutes, and no right answers.
        </p>
        <Link
          href="/chess-personality/quiz"
          className="rounded-pill bg-accent px-8 py-4 text-[18px] font-[480] text-accent-on hover:bg-accent-soft"
        >
          Take the test
        </Link>
        <ul className="mt-4 grid w-full max-w-[900px] gap-3 text-left sm:grid-cols-3">
          {PROMISES.map((p) => (
            <li key={p.title} className="rounded-xl bg-ink-card p-6">
              <h2 className="text-[17px] font-[480]">{p.title}</h2>
              <p className="mt-1.5 text-[15px] leading-[1.5] text-ink-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="all-heading" className="flex flex-col gap-6">
        <h2 id="all-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          All {TYPES.length} chess personalities
        </h2>
        <TypeGrid />
      </section>
    </div>
  );
}
