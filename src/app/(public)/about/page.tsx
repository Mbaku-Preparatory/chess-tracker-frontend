import type { Metadata } from "next";
import Link from "next/link";

import { T } from "@/components/T";
import { SHARE_IMAGE, SITE_URL } from "@/lib/site";

const TITLE = "About | Chess Preparatory";
const DESCRIPTION =
  "Chess Preparatory is built by Clifford Ombiro, a Kenyan tournament player who wanted one place for a player's Chess.com, Lichess and over-the-board games.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/about", type: "profile", siteName: "Chess Preparatory", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] },
};

const NAME = "Clifford Ombiro";
const FIDE_ID = "10829504";
// His own profile on the site: the live rating, and the app's public side in one link.
const PROFILE = `/player/ombiro-clifford/${FIDE_ID}`;
const GITHUB = "https://github.com/Ombiro96";
const LINKEDIN = "https://www.linkedin.com/in/clifford-ombiro-90b494242/";

const PILL = "inline-flex items-center gap-1.5 rounded-pill border border-ink-line px-4 py-2 text-[15px] text-ink-text hover:bg-ink-raised";
const PARAGRAPH = "text-[18px] leading-[1.65] text-ink-muted";

/**
 * The founder, in his own words (2026-11-19): who builds the app and why.
 * No sign-up or pricing buttons on purpose: it is here to put a person behind
 * the app, not to sell it.
 */
export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/about`,
    mainEntity: {
      "@type": "Person",
      name: NAME,
      image: `${SITE_URL}/about/clifford-ombiro.jpg`,
      nationality: "Kenya",
      jobTitle: "Software developer",
      sameAs: [`https://ratings.fide.com/profile/${FIDE_ID}`, GITHUB, LINKEDIN],
    },
  };

  return (
    <div className="pb-8 pt-10 sm:pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_300px] md:items-start md:gap-16">
        {/* First on a phone, beside the text from md up. */}
        <figure className="flex flex-col gap-5 md:sticky md:top-24 md:order-last">
          {/* A plain img, sized at the source: no image-optimisation calls on Vercel. */}
          <img
            src="/about/clifford-ombiro.jpg"
            width={320}
            height={400}
            alt={NAME}
            className="aspect-[4/5] w-full max-w-[260px] rounded-xl bg-ink-raised object-cover md:max-w-none"
          />
          <figcaption className="flex flex-wrap gap-2">
            <Link href={PROFILE} className={PILL}>
              <T>My FIDE profile</T>
            </Link>
            <a href={GITHUB} target="_blank" rel="noopener noreferrer" className={PILL}>
              {/* i18n-ignore: a brand name */}
              GitHub <span aria-hidden="true" className="text-ink-faint">↗</span>
            </a>
            <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" className={PILL}>
              {/* i18n-ignore: a brand name */}
              LinkedIn <span aria-hidden="true" className="text-ink-faint">↗</span>
            </a>
          </figcaption>
        </figure>

        <article className="flex max-w-[62ch] flex-col gap-6">
          <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft"><T>About</T></p>
          <h1 className="text-balance text-[40px] font-[480] leading-[1.08] tracking-[0.01em] sm:text-[56px]">
            <T>{"Hello, I'm Clifford Ombiro."}</T>
          </h1>

          <p className={PARAGRAPH}>
            <T>{"I'm a passionate chess player from Kenya. I built Chess Preparatory because I always found it hard to look up a player online and find their games. The app brings them together in one place: Chess.com, Lichess and, most importantly, over-the-board games."}</T>
          </p>
          <p className={PARAGRAPH}>
            <T>{"I'm a chess player above all else, and for some reason I'm known for knowing only openings. That says a lot about the guy who would build a tool like this."}</T>
          </p>
          <p className={PARAGRAPH}>
            <T>{"I play in the Kenya Chess Premier League and I'm a regular tournament player, so you can be sure this app is made and curated for passionate players."}</T>
          </p>

          <blockquote className="my-2 border-l-2 border-accent pl-6 text-[21px] font-[420] leading-[1.5] text-ink-text sm:text-[23px]">
            <T>{"My goal may not be to become a GM, but I enjoy the game, and I always love the look of despair on my opponents' faces when they realise, fifteen moves in, that they're wrapped up in my opening theory."}</T>
          </blockquote>

          <p className={PARAGRAPH}>
            <T>{"Away from the board, I've been a software developer for about four years. I speak three languages: English, Swahili and JavaScript."}</T>
          </p>
          <p className={PARAGRAPH}>
            <T>{"You're more than welcome to give the app a try."}</T>
          </p>
        </article>
      </div>
    </div>
  );
}
