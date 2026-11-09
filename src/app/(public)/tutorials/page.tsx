import type { Metadata } from "next";

import { TutorialGrid } from "@/components/tutorials/TutorialGrid";
import { SHARE_IMAGE, SITE_URL } from "@/lib/site";
import { TUTORIALS, tutorialFiles } from "@/lib/tutorials";

const TITLE = "Tutorials | Chess Preparatory";
const DESCRIPTION =
  "Short videos on preparing for a chess opponent: add them, import their Chess.com and Lichess games, explore their opening tree, play their bot, ask Mbaku AI, and read chess books on a board.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tutorials" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/tutorials", type: "website", siteName: "Chess Preparatory", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] },
};

// The day the videos were recorded, for the structured data.
const RECORDED = "2026-11-10";

/** Every tutorial, for anyone: the same videos the app's "Watch how" links open. */
export default function TutorialsPage() {
  const jsonLd = TUTORIALS.map((t) => ({
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: t.title,
    description: t.summary,
    thumbnailUrl: `${SITE_URL}${tutorialFiles(t.id).poster}`,
    contentUrl: `${SITE_URL}${tutorialFiles(t.id).video}`,
    uploadDate: RECORDED,
    duration: `PT${t.seconds}S`,
    publisher: { "@type": "Organization", name: "Chess Preparatory", url: SITE_URL },
  }));

  return (
    <div className="flex flex-col gap-14 pt-10 sm:pt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="flex flex-col items-start gap-5">
        <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft">Tutorials</p>
        <h1 className="max-w-[20ch] text-balance text-[42px] font-[480] leading-[1.08] tracking-[0.01em] sm:text-[56px]">
          Prepare for your next opponent.
        </h1>
        <p className="max-w-[58ch] text-[18px] leading-[1.5] text-ink-muted">
          Six short videos, each under a minute, recorded in the app. Start with adding an opponent; the rest build on it.
        </p>
      </section>
      <TutorialGrid />
    </div>
  );
}
