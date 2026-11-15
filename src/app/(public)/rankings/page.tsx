import type { Metadata } from "next";
import Link from "next/link";

import { AdSlot } from "@/components/public/AdSlot";
import { FederationFilter } from "@/components/public/rankings/FederationFilter";
import { RankingsIntro } from "@/components/public/rankings/RankingsIntro";
import { RankingsTable } from "@/components/public/rankings/RankingsTable";
import { Country } from "@/components/Country";
import { T } from "@/components/T";
import { federationFor } from "@/lib/federations";
import { profilePath } from "@/lib/publicPlayer";
import {
  LISTS,
  RANKINGS_PAGE_SIZE,
  TIME_CONTROLS,
  fetchRankings,
  parseView,
  rankingsPath,
  type RankingsView,
} from "@/lib/rankings";
import { describe, heading } from "@/lib/rankingsText";
import { SHARE_IMAGE, SITE_URL } from "@/lib/site";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// FIDE's junior lists: under 20 on 1 January.
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const view = parseView(await searchParams);
  // The same request as the page's: Next dedupes it, so this costs nothing.
  const { count, results } = await fetchRankings(view);
  const title = `${heading(view)}${view.page > 1 ? ` · page ${view.page}` : ""} | Chess Preparatory`;
  const description = describe(view, count);
  const canonical = rankingsPath(view);
  return {
    title,
    description,
    alternates: { canonical },
    // An empty list, or a page past its end, is not a page worth a search result.
    ...(results.length === 0 && { robots: { index: false } }),
    openGraph: { title, description, url: canonical, type: "website", siteName: "Chess Preparatory", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE] },
  };
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-pill px-4 py-2 text-[14px] ${
        active ? "bg-ink-text text-ink-canvas" : "bg-ink-card text-ink-muted hover:bg-ink-raised hover:text-ink-text"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function RankingsPage({ searchParams }: { searchParams: SearchParams }) {
  const view = parseView(await searchParams);
  const { count, results } = await fetchRankings(view);
  const fed = view.fed ? federationFor(view.fed) : null;
  const title = heading(view);
  const offset = (view.page - 1) * RANKINGS_PAGE_SIZE;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: title.charAt(0).toUpperCase() + title.slice(1),
      description: describe(view, count),
      url: `${SITE_URL}${rankingsPath(view)}`,
      numberOfItems: count,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      itemListElement: results.map((e, i) => ({
        "@type": "ListItem",
        position: offset + i + 1,
        name: e.player.fullName,
        url: `${SITE_URL}${profilePath(e.player)}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Rankings", item: `${SITE_URL}/rankings` },
        ...(fed ? [{ "@type": "ListItem", position: 3, name: fed.name, item: `${SITE_URL}/rankings?fed=${fed.code}` }] : []),
      ],
    },
  ];

  return (
    <article className="flex flex-col gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <header className="flex flex-col gap-4 pt-4">
        <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft"><T>FIDE rating lists</T></p>
        <RankingsIntro view={view} count={count} />
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <nav aria-label="Time control" className="flex gap-2 overflow-x-auto">
            {TIME_CONTROLS.map((t) => (
              <Tab key={t.key} href={rankingsPath({ ...view, tc: t.key, page: 1 })} active={view.tc === t.key}>
                <T>{t.label}</T>
              </Tab>
            ))}
          </nav>
          <nav aria-label="List" className="flex gap-2 overflow-x-auto">
            {LISTS.map((l) => (
              <Tab key={l.key} href={rankingsPath({ ...view, list: l.key, page: 1 })} active={view.list === l.key}>
                <T>{l.label}</T>
              </Tab>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <FederationFilter view={view} />
          <Link href="/rankings/countries" className="whitespace-nowrap text-[14px] text-ink-muted underline decoration-ink-line underline-offset-4 hover:text-ink-text">
            <T>All countries</T>
          </Link>
        </div>
      </div>

      {/* Above the table: below it, few scroll a hundred rows to see it. */}
      <AdSlot />

      <section className="rounded-xl bg-ink-card p-4 sm:p-8" aria-label="Ranked players">
        {results.length > 0 ? (
          <RankingsTable view={view} count={count} results={results} />
        ) : (
          <p className="py-12 text-center text-[15px] text-ink-faint">
            {count > 0 ? (
              <T>This page is past the end of the list.</T>
            ) : fed ? (
              <T vars={{ country: <Country code={fed.code} /> }}>{"No ranked players in {country} on this list."}</T>
            ) : (
              <T>No ranked players on this list.</T>
            )}{" "}
            <Link href={rankingsPath({ ...view, page: 1, ...(count > 0 ? {} : { fed: "" }) })} className="text-ink-muted underline underline-offset-4 hover:text-ink-text">
              {count > 0 ? <T>Back to the top</T> : <T>See the world list</T>}
            </Link>
          </p>
        )}
      </section>
    </article>
  );
}
