"use client";

import { useEffect, useState } from "react";

import { AuthLink } from "@/components/public/AuthLink";
import { readGuestBook, TRIAL_MS, writeGuestBook, type GuestBook } from "@/lib/guestBook";

/**
 * The guest trial's clock: reading time counts while the book is on screen
 * (its tab in front), and is saved on this device as it goes, so leaving and
 * coming back doesn't reset it. Returns the time used, or null before the
 * device's record is read.
 */
export function useTrialClock(trial: GuestBook | null, running: boolean): number | null {
  const [used, setUsed] = useState<number | null>(trial?.usedMs ?? null);

  useEffect(() => setUsed(trial?.usedMs ?? null), [trial?.publicId, trial?.usedMs]);

  useEffect(() => {
    if (!trial || !running) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      // From storage, not state: another tab on the same book counts too.
      const saved = readGuestBook();
      if (!saved || saved.publicId !== trial.publicId) return;
      const usedMs = Math.min(TRIAL_MS, saved.usedMs + 1000);
      writeGuestBook({ ...saved, usedMs });
      setUsed(usedMs);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [trial, running]);

  return used;
}

const minutes = (ms: number) => Math.max(1, Math.ceil(ms / 60_000));

/** Above the book while the trial runs: the time left, and the way to keep it. */
export function TrialBar({ used }: { used: number }) {
  const left = TRIAL_MS - used;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent/10 px-4 py-3 text-[14px]">
      <p className="text-ink-text">
        <span className="font-[520] tabular-nums">
          {minutes(left)} {minutes(left) === 1 ? "minute" : "minutes"} left
        </span>{" "}
        <span className="text-ink-muted">of your free try. Create a free account to keep this book.</span>
      </p>
      <AuthLink href="/signup" className="rounded-pill bg-accent px-4 py-1.5 text-[14px] font-[520] text-accent-on hover:bg-accent-soft">
        Create a free account
      </AuthLink>
    </div>
  );
}

/** When the ten minutes are up: the book isn't gone, it's waiting in an account. */
export function TrialOver({ title }: { title: string }) {
  return (
    <section aria-label="Your free try" className="mx-auto flex max-w-2xl flex-col items-start gap-4 rounded-xl bg-ink-card p-6 sm:p-8">
      <h2 className="text-[24px] font-[480] leading-tight">Your ten minutes with “{title}” are up.</h2>
      <p className="max-w-[60ch] text-[16px] leading-[1.5] text-ink-muted">
        Create a free account and this book moves into it, already read: nothing to upload again. From there you can read all of
        it, add more books, and keep your place in each.
      </p>
      <div className="flex flex-wrap gap-3">
        <AuthLink href="/signup" className="rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft">
          Create a free account
        </AuthLink>
        <AuthLink href="/login" className="rounded-pill border border-ink-text/80 px-6 py-3 text-[16px] text-ink-text hover:bg-ink-raised">
          Log in
        </AuthLink>
      </div>
    </section>
  );
}
