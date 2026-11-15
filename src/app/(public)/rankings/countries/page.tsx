import type { Metadata } from "next";
import Link from "next/link";

import { CountryIndex } from "@/components/public/rankings/CountryIndex";
import { T } from "@/components/T";
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

export default function CountriesPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <nav className="text-[14px] text-ink-faint">
          <Link href="/rankings" className="hover:text-ink-muted"><T>{"Rankings"}</T></Link>
          <span className="mx-2">/</span>
          <span><T>{"Countries"}</T></span>
        </nav>
        <h1 className="text-[32px] font-[480] leading-[1.15] sm:text-[42px]"><T>{"Chess rankings by country"}</T></h1>
        <p className="max-w-[60ch] text-[16px] leading-[1.5] text-ink-muted">
          <T>{"Each federation's players ranked on FIDE's latest monthly rating list. Open a country for its classical list, then switch to rapid, blitz, women, juniors or girls."}</T>
        </p>
      </header>

      <CountryIndex />
    </div>
  );
}
