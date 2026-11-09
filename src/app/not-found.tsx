import type { Metadata } from "next";
import Link from "next/link";

import { PlayerSearch } from "@/components/public/PlayerSearch";
import { PublicShell } from "@/components/public/PublicShell";

export const metadata: Metadata = {
  title: "Page not found | Chess Preparatory",
  robots: { index: false },
};

const PLACES = [
  { href: "/rankings", label: "Rankings" },
  { href: "/chess-bot", label: "Create your own bot" },
  { href: "/chess-books", label: "Chess books" },
  { href: "/guess-the-player", label: "Guess the player" },
  { href: "/pricing", label: "Pricing" },
];

/**
 * Every address that leads nowhere. Next's default 404 has no header and no
 * links, so somebody who arrived from a broken link had nowhere to go but
 * back, and from a shared link there is no back. This one keeps the site's
 * header and footer and offers the way home, a player search and the main
 * pages.
 */
export default function NotFound() {
  return (
    <PublicShell>
      <section className="flex flex-col items-start gap-8 py-16 sm:py-24">
        <div className="flex flex-col gap-4">
          <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft">Page not found</p>
          <h1 className="max-w-[18ch] text-balance text-[40px] font-[480] leading-[1.1] sm:text-[56px]">
            This square is empty.
          </h1>
          <p className="max-w-[56ch] text-[17px] leading-[1.55] text-ink-muted">
            That address doesn&apos;t lead anywhere on Chess Preparatory. The link may have a typo, or the page has
            moved.
          </p>
        </div>

        <Link
          href="/"
          className="rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft"
        >
          Go to the home page
        </Link>

        <div className="flex w-full max-w-[640px] flex-col gap-3">
          <p className="text-[15px] text-ink-muted">Or find a player:</p>
          <PlayerSearch />
        </div>

        <nav aria-label="Main pages" className="flex flex-wrap gap-x-6 gap-y-3 text-[15px]">
          {PLACES.map((p) => (
            <Link key={p.href} href={p.href} className="text-ink-text underline decoration-ink-line underline-offset-4 hover:text-accent-soft">
              {p.label}
            </Link>
          ))}
        </nav>
      </section>
    </PublicShell>
  );
}
