"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TutorialLink } from "@/components/tutorials/TutorialLink";
import { dismissOnboarding, fetchOnboarding, STEP_INFO, type Onboarding } from "@/lib/onboarding";

/**
 * "Getting started" on My Opponents: six first steps, each with a link to do
 * it and its tutorial video. Ticks come from the account's own data
 * (lib/onboarding.ts), so they are right on every device. Gone once all six
 * are done or the user hides it.
 */
export function GettingStarted() {
  const [data, setData] = useState<Onboarding | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchOnboarding().then(setData).catch(() => setFailed(true));
  }, []);

  if (failed || !data || !data.show) return null;

  const op = data.opponent?.publicId ?? null;
  const pct = Math.round((100 * data.doneCount) / data.steps.length);

  return (
    <section aria-labelledby="getting-started" className="card mb-8 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="getting-started" className="text-lg font-bold text-gray-900 dark:text-gray-100">Getting started</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {data.doneCount} of {data.steps.length} done. Each step has a short video if you&apos;re not sure how.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dismissOnboarding().then(setData).catch(() => {})}
          className="shrink-0 rounded-lg px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-200"
        >
          Hide
        </button>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-elevated" aria-hidden>
        <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${pct}%` }} />
      </div>

      <ol className="mt-5 flex flex-col divide-y divide-gray-100 dark:divide-dark-border">
        {data.steps.map(({ key, done }) => {
          const info = STEP_INFO[key];
          const blocked = info.needsOpponent && !op;
          return (
            <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <span
                aria-hidden
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  done ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300 dark:border-dark-border"
                }`}
              >
                {done && (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="sr-only">{done ? "Done: " : "To do: "}</span>
                {done ? (
                  <span className="text-sm text-gray-400 line-through dark:text-gray-500">{info.label}</span>
                ) : (
                  <Link href={blocked ? "/players/new" : info.href(op)} className="text-sm font-medium text-gray-900 hover:text-brand-700 dark:text-gray-100 dark:hover:text-brand-300">
                    {info.label}
                    {blocked && <span className="font-normal text-gray-500 dark:text-gray-400"> (add an opponent first)</span>}
                  </Link>
                )}
              </span>
              {!done && <TutorialLink id={info.tutorial} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
