import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Emblem } from "@/components/public/personality/Emblem";
import { ResultActions, ResultEyebrow, ResultSliders } from "@/components/public/personality/ResultParts";
import { Sliders } from "@/components/public/personality/Sliders";
import { TypeGrid } from "@/components/public/personality/TypeGrid";
import { aName, BY_SLUG, TYPES, typicalScores } from "@/lib/chessPersonality";
import { federationFor } from "@/lib/federations";
import { profilePath } from "@/lib/publicPlayer";

type Params = Promise<{ type: string }>;

// Sixteen pages, built once. A shared link's ?s= is read in the browser
// (ResultParts), so no visit makes the server render.
export const dynamicParams = false;
export function generateStaticParams() {
  return TYPES.map((t) => ({ type: t.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const type = BY_SLUG.get((await params).type);
  if (!type) return {};
  const title = `${type.name}: chess personality`;
  const description = `${type.tagline} ${type.player.name} is ${aName(type)}. Which chess personality are you?`;
  const url = `/chess-personality/${type.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: "Chess Preparatory" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PersonalityTypePage({ params }: { params: Params }) {
  const type = BY_SLUG.get((await params).type);
  if (!type) notFound();
  const fed = federationFor(type.player.federation);

  return (
    <div className="flex flex-col gap-[72px] sm:gap-24">
      <article className="flex flex-col gap-10 pt-6 sm:pt-12">
        <header className="flex flex-col items-center gap-4 text-center">
          <Emblem type={type} size={128} />
          <Suspense fallback={<p className="text-[13px] uppercase tracking-[0.12em] text-accent-soft">Chess personality</p>}>
            <ResultEyebrow slug={type.slug} />
          </Suspense>
          <h1 className="text-balance text-[42px] font-[480] leading-[1.08] tracking-[0.01em] sm:text-[58px]">{type.name}</h1>
          <p className="max-w-[44ch] text-balance text-[18px] leading-[1.5] text-ink-muted">{type.tagline}</p>
        </header>

        <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
          <section className="flex flex-col gap-6 rounded-xl bg-ink-card p-6 sm:p-8">
            <p className="text-[17px] leading-[1.65]">{type.description}</p>
            <div>
              <h2 className="mb-3 text-[13px] uppercase tracking-[0.1em] text-ink-muted">Superpowers</h2>
              <ul className="flex flex-col gap-2">
                {type.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-3 text-[16px]">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: type.colour }} aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mb-1.5 text-[13px] uppercase tracking-[0.1em] text-ink-muted">Kryptonite</h2>
              <p className="text-[16px] text-ink-muted">{type.kryptonite}</p>
            </div>
            <Suspense fallback={null}>
              <ResultActions slug={type.slug} />
            </Suspense>
          </section>

          <div className="flex flex-col gap-4">
            <section className="rounded-xl bg-ink-card p-6 sm:p-8">
              <Suspense fallback={<Sliders scores={typicalScores(type)} colour={type.colour} />}>
                <ResultSliders slug={type.slug} />
              </Suspense>
            </section>
            <section className="rounded-xl bg-ink-card p-6 sm:p-8">
              <h2 className="mb-3 text-[13px] uppercase tracking-[0.1em] text-ink-muted">Player like you</h2>
              <Link href={profilePath(type.player)} className="group flex flex-col gap-1">
                <span className="text-[21px] font-[480] leading-tight group-hover:text-accent-soft">
                  {type.player.name} is {aName(type)}
                </span>
                <span className="text-[14px] text-ink-muted">
                  {type.player.fideName ? `${type.player.fideName} · ` : ""}
                  {type.player.title} · {fed.flag ? `${fed.flag} ` : ""}
                  {fed.name}
                </span>
              </Link>
            </section>
          </div>
        </div>
      </article>

      <section aria-labelledby="all-heading" className="flex flex-col gap-6">
        <h2 id="all-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          All {TYPES.length} chess personalities
        </h2>
        <TypeGrid current={type.slug} />
      </section>
    </div>
  );
}
