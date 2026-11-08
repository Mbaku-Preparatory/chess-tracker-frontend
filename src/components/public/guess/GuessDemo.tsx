"use client";

import { useEffect, useMemo, useState } from "react";

import { federationFor } from "@/lib/federations";
import { BORN_CLOSE, feedbackFor, MAX_GUESSES, playerById, RATING_CLOSE, type Feedback, type PoolPlayer } from "@/lib/guessThePlayer";

import { GuessRow } from "./GuessRow";

/**
 * Demo mode: a made-up round played out on its own, so a first-time visitor
 * sees how the clues work before guessing. It never touches today's game.
 *
 * The mystery player is Anish Giri, and the three guesses were picked to show
 * every colour and both arrows: Magnus Carlsen (same continent, rating and
 * age far off), Jorden van Foreest (same federation, rating close), then Giri.
 * The captions are written from the real clues, so a monthly data refresh
 * cannot make them lie.
 */
const DEMO = { answer: "24116068", guesses: ["1503014", "1039784", "24116068"] };

export function demoAvailable(): boolean {
  return [DEMO.answer, ...DEMO.guesses].every((id) => playerById(id));
}

type Step = {
  ms: number;
  typed: string;
  suggest: PoolPlayer | null;
  rows: number;
  shown: number;
  focus: number | null;
  caption: string;
};

function clueCaption(tile: number, f: Feedback, guess: PoolPlayer): string {
  if (tile === 0) {
    const fed = federationFor(guess.federation).name;
    if (f.federation.mark === "hit") return `Green: the same federation, ${fed}.`;
    if (f.federation.mark === "close") return `Yellow: not ${fed}, but a federation on the same continent.`;
    return `Red: a different federation, on another continent.`;
  }
  if (tile === 1) return f.title.mark === "hit" ? `Green: the same title, ${guess.title}.` : "Red: a different title.";
  if (tile === 2) {
    if (f.rating.mark === "hit") return "Green: exactly the same rating.";
    const near = f.rating.mark === "close" ? `Yellow: within ${RATING_CLOSE} points.` : `Red: more than ${RATING_CLOSE} points away.`;
    return `${near} The arrow says the mystery player is rated ${f.rating.direction === "up" ? "higher" : "lower"} than ${guess.rating}.`;
  }
  if (f.born.mark === "hit") return "Green: born the same year.";
  const near = f.born.mark === "close" ? `Yellow: within ${BORN_CLOSE} years.` : `Red: more than ${BORN_CLOSE} years apart.`;
  return `${near} The arrow says they were born ${f.born.direction === "up" ? "later" : "earlier"} than ${guess.born}.`;
}

function buildScript(): Step[] {
  const answer = playerById(DEMO.answer)!;
  const guesses = DEMO.guesses.map((id) => playerById(id)!);
  const steps: Step[] = [];
  const base = { typed: "", suggest: null, rows: 0, shown: 4, focus: null };
  steps.push({ ...base, ms: 2600, caption: "In this demo the mystery player is hidden, just like in the real game. Let's find them." });

  guesses.forEach((guess, gi) => {
    const word = guess.name.split(" ")[0];
    const typing = gi === 0 ? "Type any player's name…" : gi === DEMO.guesses.length - 1 ? `One more guess: ${guess.name}.` : "Use the clues for the next guess.";
    for (let k = 1; k <= word.length; k++) steps.push({ ...base, rows: gi, ms: 120, typed: word.slice(0, k), caption: typing });
    steps.push({ ...base, rows: gi, ms: 1100, typed: word, suggest: guess, caption: gi === 0 ? "…and pick them from the list." : typing });

    const f = feedbackFor(guess, answer);
    if (f.solved) {
      for (let t = 0; t < 4; t++) steps.push({ ...base, rows: gi + 1, shown: t + 1, ms: 260, caption: "" });
      steps.push({
        ...base,
        rows: gi + 1,
        ms: Infinity,
        caption: `All four green: ${answer.name} is the mystery player, found in ${gi + 1} guesses. In the real game you have ${MAX_GUESSES}.`,
      });
      return;
    }
    for (let t = 0; t < 4; t++) {
      steps.push({ ...base, rows: gi + 1, shown: t + 1, focus: t, ms: gi === 0 ? 3200 : 2600, caption: clueCaption(t, f, guess) });
    }
  });
  return steps;
}

export function GuessDemo({ onClose }: { onClose: () => void }) {
  const script = useMemo(buildScript, []);
  const [at, setAt] = useState(0);
  const step = script[at];
  const done = step.ms === Infinity;

  useEffect(() => {
    if (done) return;
    const t = window.setTimeout(() => setAt((i) => i + 1), step.ms);
    return () => window.clearTimeout(t);
  }, [at, step.ms, done]);

  const answer = playerById(DEMO.answer)!;
  const guesses = DEMO.guesses.map((id) => playerById(id)!);

  return (
    <section aria-label="Demo" className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft">Demo mode · not today&apos;s puzzle</p>
        {!done && (
          <button type="button" onClick={onClose} className="text-[14px] text-ink-muted underline decoration-ink-line underline-offset-4 hover:text-ink-text">
            Skip
          </button>
        )}
      </div>

      {/* The caption: what the highlighted tile means. */}
      <p role="status" aria-live="polite" className="min-h-[3.5rem] rounded-xl bg-ink-card px-5 py-4 text-[17px] leading-[1.45]">
        {step.caption || " "}
      </p>

      {!done && (
        <div className="relative" aria-hidden>
          <div className="flex h-14 items-center rounded-pill border border-ink-line bg-ink-card px-6 text-[17px]">
            {step.typed ? <span className="text-ink-text">{step.typed}</span> : <span className="text-ink-faint">Type a player&apos;s name</span>}
            <span className="ml-0.5 h-6 w-px animate-pulse bg-ink-text" />
          </div>
          {step.suggest && (
            <div className="absolute inset-x-0 top-[calc(100%+6px)] z-10 overflow-hidden rounded-xl border border-ink-line bg-ink-card shadow-lg">
              <div className="flex items-center gap-3 bg-ink-raised px-5 py-3 text-[16px]">
                <span className="min-w-0 flex-1 truncate">
                  <span className="mr-1.5 text-accent">{step.suggest.title}</span>
                  {step.suggest.name}
                </span>
                <span className="text-[14px] text-ink-muted">
                  {federationFor(step.suggest.federation).flag} {step.suggest.federation}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <ol className="flex flex-col gap-4" aria-label="Demo guesses">
        {guesses.slice(0, step.rows).map((g, i) => (
          <GuessRow
            key={g.fideId}
            guess={g}
            answer={answer}
            linked={false}
            shown={i === step.rows - 1 ? step.shown : 4}
            focus={i === step.rows - 1 ? step.focus : null}
          />
        ))}
      </ol>

      {done && (
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={onClose} className="rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft">
            Your turn
          </button>
          <button type="button" onClick={() => setAt(0)} className="text-[15px] text-ink-muted underline decoration-ink-line underline-offset-4 hover:text-ink-text">
            Watch again
          </button>
        </div>
      )}
    </section>
  );
}
