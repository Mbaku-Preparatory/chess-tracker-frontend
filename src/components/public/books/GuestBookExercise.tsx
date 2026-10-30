"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BookExerciseView } from "@/components/books/BookExerciseView";
import { readGuestBook, TRIAL_MS, type GuestBook } from "@/lib/guestBook";

import { TrialBar, TrialOver, useTrialClock } from "./trial";

/** One exercise of the book tried without an account: the app's solve view,
 * read with the trial's key, on the same ten-minute clock. */
export function GuestBookExercise({ number }: { number: number }) {
  const router = useRouter();
  const [trial, setTrial] = useState<GuestBook | null | undefined>(undefined);

  useEffect(() => {
    const saved = readGuestBook();
    // Nothing tried here, or kept in an account already: the trial page says what to do.
    if (!saved || saved.claimed) router.replace("/chess-books/try");
    else setTrial(saved);
  }, [router]);

  const used = useTrialClock(trial ?? null, Boolean(trial));
  if (!trial) return <div className="mx-auto aspect-square w-full max-w-[640px] animate-pulse rounded-xl bg-ink-raised" />;
  const usedMs = used ?? trial.usedMs;
  if (usedMs >= TRIAL_MS) return <TrialOver title={trial.title} />;

  return (
    <div className="flex flex-col gap-4">
      <TrialBar used={usedMs} />
      <BookExerciseView
        publicId={trial.publicId}
        number={number}
        guestKey={trial.key}
        bookHref="/chess-books/try"
        hrefFor={(n) => `/chess-books/try/${n}`}
      />
    </div>
  );
}
