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

const PILL = "inline-flex h-11 items-center rounded-pill border border-ink-line px-4 text-[15px] text-ink-text hover:bg-ink-raised";
const ICON_LINK = "inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink-line text-ink-text hover:bg-ink-raised";

/** GitHub's and LinkedIn's marks, one colour (Simple Icons, CC0). */
function GitHubLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 4.892v6.249zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
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
        {/* First on a phone, centred; beside the text from md up. */}
        <figure className="flex flex-col items-center gap-6 md:sticky md:top-24 md:order-last">
          {/* A plain img, sized at the source: no image-optimisation calls on Vercel. */}
          <img
            src="/about/clifford-ombiro.jpg"
            width={320}
            height={320}
            alt={NAME}
            className="aspect-square w-full max-w-[200px] rounded-full bg-ink-raised object-cover ring-1 ring-ink-line md:max-w-[240px]"
          />
          <figcaption className="flex items-center gap-2">
            <Link href={PROFILE} className={PILL}>
              <T>My FIDE profile</T>
            </Link>
            {/* i18n-ignore: a brand name */}
            <a href={GITHUB} target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub" className={ICON_LINK}>
              <GitHubLogo />
            </a>
            {/* i18n-ignore: a brand name */}
            <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn" className={ICON_LINK}>
              <LinkedInLogo />
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
