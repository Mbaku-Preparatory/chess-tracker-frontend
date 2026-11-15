import type { Metadata } from "next";
import Link from "next/link";

import { ABOUT, bookPath, fetchPublicBooks } from "@/lib/publicBook";
import { SHARE_IMAGE, SITE_URL } from "@/lib/site";
import { T } from "@/components/T";
import { msg } from "@/lib/i18n";

const TITLE = "Read chess books with a board, and solve their exercises | Chess Preparatory";
const DESCRIPTION =
  "Upload a chess book as a PDF and read it with a board beside the page: every move and diagram opens as a position. A book of exercises becomes puzzles to solve on the board. The book stays on your device.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/chess-books" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/chess-books", type: "website", siteName: "Chess Preparatory", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] },
};

const WAYS = [
  {
    title: msg("Read a scanned book with a board"),
    body: msg("Any chess book as a PDF, scans included. Every move and diagram the reader finds is highlighted on the page: tap one and the board shows the position; ← and → walk the line it belongs to, variations and all."),
  },
  {
    title: msg("Play your own moves"),
    body: msg("The board is not just for looking. Play any move from any position in the book to try an idea, step back into the book's line when you are done, and switch the engine on to check either."),
  },
  {
    title: msg("Solve a book of exercises"),
    body: msg("A book typeset in a chess font, with numbered diagrams and solutions, comes out as puzzles: the position with the side to move at the bottom, your move checked against the book's, and its notes once you have solved it or asked to see the answer."),
  },
];

const FAQ = [
  {
    q: msg("What kind of PDF works?"),
    a: msg("Any PDF of a chess book in algebraic notation, up to 50 MB. A scan, or a photographed book saved as a PDF, becomes a reader: the pages as they are, with the moves and diagrams linked to the board. A book typeset in a chess font, such as most puzzle books from the last twenty years, becomes a set of exercises to solve. Books in descriptive notation (P-K4) are not read yet."),
  },
  {
    q: msg("What happens to my book?"),
    a: msg("A scanned book never leaves your device for good: the server reads it once to find where each move and diagram sits and the position each leads to, keeps only that index, and deletes the file. The reader then draws your own copy of the PDF, which your browser keeps. Nobody else can see your books."),
  },
  {
    q: msg("How long does it take?"),
    a: msg("A typeset exercise book takes about half a minute. A scanned book is read page by page and takes a few minutes for a few hundred pages; you can leave and come back, or ask to be emailed when it is ready."),
  },
  {
    q: msg("What if the reader misses a move or reads one wrongly?"),
    a: msg("A move that does not fit the position is left unlinked rather than guessed, so the line through the book stays legal. The reader shows how many moves and diagrams it found. Reading of scans is being improved; a clearer scan reads better."),
  },
  {
    q: msg("Can I try it without a book?"),
    a: msg("Yes. The demo books below are read with the same reader, and need no account. To read your own books you need an account, which starts with a free trial."),
  },
  {
    q: msg("Is it legal to upload a book I bought?"),
    a: msg("Your book stays yours: it is read for your own study, on your own device, and shown to no one else. The demo books here are in the public domain."),
  },
];

/**
 * The books feature, for anyone searching for it: what it does, the
 * questions people ask, and the demo books to try it on.
 */
export default async function ChessBooksPage() {
  const books = await fetchPublicBooks();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: TITLE,
      description: DESCRIPTION,
      url: `${SITE_URL}/chess-books`,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];

  return (
    <div className="flex flex-col gap-[72px] sm:gap-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="flex flex-col items-start gap-8 pt-10 sm:pt-20">
        <p className="text-[13px] uppercase tracking-[0.1em] text-accent-soft"><T>{"Chess books"}</T></p>
        <h1 className="max-w-[18ch] text-balance text-[42px] font-[480] leading-[1.08] tracking-[0.01em] sm:text-[65px]">
          <T>{"Read a chess book with a board beside it."}</T>
        </h1>
        <p className="max-w-[56ch] text-[18px] leading-[1.5] text-ink-muted">
          <T>{"Upload a book as a PDF, scans included, and every move and diagram in it opens on a board. Exercise books become puzzles to solve. The book stays on your device."}</T>
        </p>
        <div className="flex flex-wrap gap-3">
          {/* No account needed: a ten-minute try with your own book. */}
          <Link href="/chess-books/try" className="rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft">
            <T>{"Upload a book"}</T>
          </Link>
          {books[0] && (
            <Link href={bookPath(books[0].publicSlug)} className="rounded-pill border border-ink-text/80 px-6 py-3 text-[16px] text-ink-text hover:bg-ink-raised">
              <T>{"Try the demo"}</T>
            </Link>
          )}
        </div>
      </section>

      <section aria-labelledby="ways-heading" className="flex flex-col gap-8">
        <h2 id="ways-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          <T>{"What it does"}</T>
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {WAYS.map((w) => (
            <article key={w.title} className="flex flex-col gap-3 rounded-xl bg-ink-card p-8">
              <h3 className="text-[21px] font-[480]"><T>{w.title}</T></h3>
              <p className="text-[16px] leading-[1.5] text-ink-muted"><T>{w.body}</T></p>
            </article>
          ))}
        </div>
      </section>

      {books.length > 0 && (
        <section aria-labelledby="demo-heading" className="flex flex-col gap-6">
          <h2 id="demo-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
            <T>{"Read one now"}</T>
          </h2>
          <p className="max-w-[60ch] text-[16px] leading-[1.5] text-ink-muted">
            <T>{"Public-domain books, read with the same reader. No account needed."}</T>
          </p>
          <ul className="grid gap-4 md:grid-cols-2">
            {books.map((b) => {
              const about = ABOUT[b.publicSlug];
              return (
                <li key={b.publicSlug}>
                  <Link href={bookPath(b.publicSlug)} className="flex h-full flex-col gap-2 rounded-xl bg-ink-card p-8 hover:bg-ink-raised">
                    <span className="text-[21px] font-[480] text-ink-text">{b.title}</span>
                    {about && <span className="text-[14px] text-ink-faint">{about.author}, {about.year}</span>}
                    {about && <span className="text-[15px] leading-[1.5] text-ink-muted"><T>{about.blurb}</T></span>}
                    <span className="mt-auto pt-2 text-[14px] text-ink-faint">
                      <T vars={{ pages: b.pageCount.toLocaleString("en"), diagrams: b.diagramCount.toLocaleString("en"), moves: b.moveCount.toLocaleString("en") }}>
                        {"{pages} pages · {diagrams} diagrams · {moves} moves"}
                      </T>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="books-faq-heading" className="flex flex-col gap-8">
        <h2 id="books-faq-heading" className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">
          <T>{"Questions"}</T>
        </h2>
        <dl className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="flex flex-col gap-2">
              <dt className="text-[18px] font-[480]"><T>{q}</T></dt>
              <dd className="max-w-[60ch] text-[16px] leading-[1.55] text-ink-muted"><T>{a}</T></dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
