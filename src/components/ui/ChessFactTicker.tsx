"use client";

/**
 * Rotating chess facts, shown while something slow is happening.
 *
 * A four-minute import behind a progress bar reads as a chore; the same wait
 * with something to read reads as work being done. The mobile client has done
 * this while Mbaku is thinking since the assistant shipped — this is the same
 * facts file and the same ten-second cadence, so the two apps do not develop
 * different ideas of how waiting should feel.
 */

import { useEffect, useRef, useState } from "react";

import { shuffledFacts, type ChessFact } from "@/lib/chessFacts";

// Ten seconds reads comfortably without swapping mid-sentence.
const ROTATE_MS = 10_000;

export function ChessFactTicker() {
  // Shuffled once per mount, so a long wait is not the same five facts and a
  // short one is not always the same first fact.
  const facts = useRef<ChessFact[]>(shuffledFacts()).current;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % facts.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [facts.length]);

  if (!facts.length) return null;

  return (
    <div className="mt-4 border-t border-gray-100 pt-3 dark:border-dark-border">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
        While you wait
      </p>
      <p
        // Announced politely: the text changes under a screen reader every ten
        // seconds and should not interrupt whatever it is already reading.
        aria-live="polite"
        className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
      >
        {facts[index].text}
      </p>
    </div>
  );
}
