"use client";

import Link from "next/link";

import { useLocale } from "@/hooks/useT";
import { CURRENT_FEDERATIONS, federationName } from "@/lib/federations";
import { rankingsPath } from "@/lib/rankings";

/**
 * Every federation as a plain link, grouped by first letter. The rankings page
 * picks a country from a <select>, which crawlers do not follow; this is the
 * same choice as links, so every country's list is reachable. In the reader's
 * language, so the names, their order and the letters all follow it (the
 * server's HTML is the English, for crawlers).
 */
export function CountryIndex() {
  const locale = useLocale();
  const named = CURRENT_FEDERATIONS.map((f) => ({ ...f, name: federationName(f, locale) })).sort((a, b) =>
    a.name.localeCompare(b.name, locale),
  );
  const groups = Object.entries(
    named.reduce<Record<string, typeof named>>((by, f) => {
      const letter = f.name.normalize("NFD")[0].toLocaleUpperCase(locale);
      (by[letter] ??= []).push(f);
      return by;
    }, {}),
  );

  return (
    <div className="columns-1 gap-10 sm:columns-2 lg:columns-3">
      {groups.map(([letter, federations]) => (
        <section key={letter} className="mb-8 break-inside-avoid">
          <h2 className="mb-2 text-[13px] uppercase tracking-[0.1em] text-accent-soft">{letter}</h2>
          <ul className="flex flex-col gap-1.5">
            {federations.map((f) => (
              <li key={f.code}>
                <Link
                  href={rankingsPath({ tc: "classical", list: "overall", fed: f.code, page: 1 })}
                  className="inline-flex items-baseline gap-2 text-[15px] text-ink-text hover:text-accent-soft"
                >
                  {f.flag && <span aria-hidden="true">{f.flag}</span>}
                  {f.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
