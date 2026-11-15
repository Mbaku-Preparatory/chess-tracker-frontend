"use client";

import { useLocale, useT } from "@/hooks/useT";
import { federationFor } from "@/lib/federations";
import type { RankingsView } from "@/lib/rankings";
import { describe, heading, translatedDescribe, translatedHeading } from "@/lib/rankingsText";

/** The rankings page's heading and description, in the reader's language
 * (English on the server; see lib/rankingsText.ts). */
export function RankingsIntro({ view, count }: { view: RankingsView; count: number }) {
  const locale = useLocale();
  const t = useT();
  const en = locale === "en";
  const fed = view.fed ? federationFor(view.fed) : null;
  return (
    <>
      {/* "capitalize" suits the English title only: elsewhere it would capitalise every word. */}
      <h1 className={`flex flex-wrap items-baseline gap-x-3 text-balance text-[32px] font-[480] leading-[1.15] tracking-[0.015em] sm:text-[42px] ${en ? "capitalize" : ""}`}>
        {fed?.flag && <span aria-hidden="true" className="text-[0.8em]">{fed.flag}</span>}
        <span>{en ? heading(view) : translatedHeading(view, locale, t)}</span>
      </h1>
      <p className="max-w-[68ch] text-[16px] leading-[1.6] text-ink-muted">{en ? describe(view, count) : translatedDescribe(view, t, count)}</p>
    </>
  );
}
