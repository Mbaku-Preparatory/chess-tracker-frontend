"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { QUESTIONS, resultPath, saveMyResult, scoreAnswers, typeFor } from "@/lib/chessPersonality";

/**
 * One question at a time, two answers each. Answering moves straight on;
 * Back undoes the last answer. Everything happens in the browser: nothing is
 * sent anywhere, and the result is the link the last answer opens.
 */
export function Quiz() {
  const router = useRouter();
  const [picks, setPicks] = useState<number[]>([]);
  const done = picks.length === QUESTIONS.length;
  const index = Math.min(picks.length, QUESTIONS.length - 1);
  const question = QUESTIONS[index];

  useEffect(() => {
    track("Chess personality started");
  }, []);

  useEffect(() => {
    if (!done) return;
    const scores = scoreAnswers(picks);
    const type = typeFor(scores);
    saveMyResult(type, scores);
    track("Chess personality finished", { type: type.slug });
    router.push(resultPath(type, scores));
  }, [done, picks, router]);

  const choose = (answer: number) => {
    if (!done) setPicks((p) => [...p, answer]);
  };

  // 1 and 2 on a keyboard pick the answers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") choose(0);
      if (e.key === "2") choose(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const progress = (picks.length / QUESTIONS.length) * 100;

  return (
    <section aria-label="Chess personality test" className="mx-auto flex w-full max-w-[680px] flex-col gap-8 pt-4 sm:pt-10">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[14px] text-ink-muted">
          <span>
            Question {done ? QUESTIONS.length : index + 1} of {QUESTIONS.length}
          </span>
          {picks.length > 0 && !done ? (
            <button type="button" onClick={() => setPicks((p) => p.slice(0, -1))} className="underline decoration-ink-line underline-offset-4 hover:text-ink-text">
              Back
            </button>
          ) : (
            <Link href="/chess-personality" className="underline decoration-ink-line underline-offset-4 hover:text-ink-text">
              Leave
            </Link>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-pill bg-ink-raised" aria-hidden>
          <div className="h-full rounded-pill bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {done ? (
        <p role="status" className="py-16 text-center text-[18px] text-ink-muted">
          Working out your chess personality…
        </p>
      ) : (
        <div key={index} className="flex flex-col gap-6">
          <h1 className="text-balance text-[28px] font-[480] leading-[1.2] tracking-[0.01em] sm:text-[36px]">{question.text}</h1>
          <div className="flex flex-col gap-3">
            {question.answers.map((answer, i) => (
              <button
                key={answer.text}
                type="button"
                onClick={() => choose(i)}
                className="group flex items-center gap-4 rounded-xl border border-ink-line bg-ink-card px-5 py-5 text-left text-[17px] leading-[1.4] text-ink-text transition-colors hover:border-accent hover:bg-accent/5 focus-visible:border-accent"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-raised text-[14px] text-ink-muted group-hover:bg-accent group-hover:text-accent-on">
                  {i + 1}
                </span>
                {answer.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
