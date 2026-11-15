"use client";

import { useT } from "@/hooks/useT";

/** The API could not answer. Said plainly, and as an error page rather than a
 * "not found", so search engines retry instead of dropping the profile. */
export default function PublicError({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col items-start gap-4 py-24">
      <h1 className="text-[28px] font-[480]">{t("This page could not load")}</h1>
      <p className="max-w-[60ch] text-ink-muted">
        {t("Player data is temporarily unavailable. Try again in a minute.")}
      </p>
      <button type="button" onClick={reset} className="rounded-pill bg-ink-raised px-5 py-2 hover:bg-ink-line">
        {t("Try again")}
      </button>
    </div>
  );
}
