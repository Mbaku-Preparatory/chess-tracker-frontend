import type { Metadata } from "next";
import Link from "next/link";

import { CURRENT_FEDERATIONS } from "@/lib/federations";
import { rankingsPath } from "@/lib/rankings";
import { SHARE_IMAGE } from "@/lib/site";

const TITLE = "Chess rankings by country | Chess Preparatory";
const DESCRIPTION =
  "FIDE chess rankings for every federation, from Afghanistan to Zimbabwe: classical, rapid and blitz, overall, women, juniors and girls.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/rankings/countries" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/rankings/countries", type: "website", siteName: "Chess Preparatory", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] },
};

// The rankings page picks a country from a <select>, which crawlers do not
// follow. This page is the same choice as plain links, so every country's
// list, and through it every ranked player, is reachable from the home page.
const BY_LETTER = Object.entries(
  [...CURRENT_FEDERATIONS]
    .sort((a, b) => a.name.localeCompare(b.name))
    .reduce<Record<string, typeof CURRENT_FEDERATIONS>>((groups, f) => {
      const letter = f.name.normalize("NFD")[0].toUpperCase();
      (groups[letter] ??= []).push(f);
      return groups;
    }, {}),
);

export default function CountriesPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <nav className="text-[14px] text-ink-faint">
          <Link href="/rankings" className="hover:text-ink-muted">Rankings</Link>
          <span className="mx-2">/</span>
          <span>Countries</span>
        </nav>
        <h1 className="text-[32px] font-[480] leading-[1.15] sm:text-[42px]">Chess rankings by country</h1>
        <p className="max-w-[60ch] text-[16px] leading-[1.5] text-ink-muted">
          Each federation&apos;s players ranked on FIDE&apos;s latest monthly rating list. Open a country for its
          classical list, then switch to rapid, blitz, women, juniors or girls.
        </p>
      </header>

      <div className="columns-1 gap-10 sm:columns-2 lg:columns-3">
        {BY_LETTER.map(([letter, federations]) => (
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
    </div>
  );
}
