"use client";

import { useRouter } from "next/navigation";

import { useLocale, useT } from "@/hooks/useT";
import { CURRENT_FEDERATIONS, federationName } from "@/lib/federations";
import { rankingsPath, type RankingsView } from "@/lib/rankings";

/**
 * The country picker. A plain GET form, so it works before the script loads
 * and for crawlers; with the script, choosing a country navigates at once.
 */
export function FederationFilter({ view }: { view: RankingsView }) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  // In the reader's language, and in that language's alphabetical order.
  const byName = CURRENT_FEDERATIONS.map((f) => ({ ...f, name: federationName(f, locale) })).sort((a, b) =>
    a.name.localeCompare(b.name, locale),
  );

  return (
    <form action="/rankings" method="get" className="flex items-center gap-2">
      {view.tc !== "classical" && <input type="hidden" name="tc" value={view.tc} />}
      {view.list !== "overall" && <input type="hidden" name="list" value={view.list} />}
      <label htmlFor="rankings-fed" className="sr-only">
        {t("Country or federation")}
      </label>
      <select
        // Remounted when the URL's country changes (back button, a link), so
        // the picker never shows a country the list is not for.
        key={view.fed}
        id="rankings-fed"
        name="fed"
        defaultValue={view.fed}
        onChange={(e) => router.push(rankingsPath({ ...view, fed: e.target.value, page: 1 }))}
        className="h-10 max-w-[260px] rounded-pill border border-ink-line bg-ink-card px-4 text-[14px] text-ink-text hover:border-ink-faint focus:border-accent focus:outline-none"
      >
        <option value="">{t("All countries")}</option>
        {byName.map((f) => (
          <option key={f.code} value={f.code}>
            {f.flag ? `${f.flag} ` : ""}
            {f.name}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="h-10 rounded-pill bg-ink-raised px-4 text-[14px] hover:bg-ink-line">
          {t("Show")}
        </button>
      </noscript>
    </form>
  );
}
