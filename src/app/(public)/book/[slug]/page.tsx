import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookReader } from "@/components/books/BookReader";
import { ABOUT, bookPath, fetchPublicBook } from "@/lib/publicBook";
import { SHARE_IMAGE, SITE_URL } from "@/lib/site";

type Params = Promise<{ slug: string }>;

const n = (x: number) => x.toLocaleString("en");

async function load(params: Params) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const book = await fetchPublicBook(slug);
  if (!book) notFound();
  return { book, about: ABOUT[slug] ?? null };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { book, about } = await load(params);
  const title = `${book.title}${about ? ` by ${about.author}` : ""}, read with a chess board | Chess Preparatory`;
  const description = [
    `Read ${book.title}${about ? ` (${about.author}, ${about.year})` : ""} online with a board beside the page:`,
    `tap any of its ${n(book.moveCount)} moves or ${n(book.diagramCount)} diagrams to see the position, step through the lines, play your own moves and check them with an engine.`,
    "Free, no account needed.",
  ].join(" ");
  const canonical = bookPath(book.publicSlug);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "book", siteName: "Chess Preparatory", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE] },
  };
}

/**
 * A demo book, for anyone: the reader over a PDF the server provides. The
 * text above the reader is what a crawler reads, since the book's own pages
 * are drawn in the browser.
 */
export default async function PublicBookPage({ params }: { params: Params }) {
  const { book, about } = await load(params);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    ...(about && { author: { "@type": "Person", name: about.author }, datePublished: String(about.year), abstract: about.blurb }),
    url: `${SITE_URL}${bookPath(book.publicSlug)}`,
    numberOfPages: book.pageCount,
    isAccessibleForFree: true,
    inLanguage: "en",
    workExample: {
      "@type": "Book",
      bookFormat: "https://schema.org/EBook",
      potentialAction: { "@type": "ReadAction", target: `${SITE_URL}${bookPath(book.publicSlug)}` },
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="flex flex-col gap-3">
        <nav className="text-[14px] text-ink-faint">
          <Link href="/chess-books" className="hover:text-ink-muted">Chess books</Link>
          <span className="mx-2">/</span>
          <span>{book.title}</span>
        </nav>
        <p className="max-w-[70ch] text-[15px] leading-[1.5] text-ink-muted">
          {about ? `${about.author}, ${about.year}. ${about.blurb} ` : ""}
          This copy is read by Chess Preparatory: every one of its {n(book.moveCount)} moves and {n(book.diagramCount)} diagrams opens on the board
          beside the page. Tap a move to see the position, use ← and → to step through the line, or play your own moves and switch the engine on.
          {about && about.year < 1930 ? " The book is in the public domain." : ""}
        </p>
      </section>
      <BookReader source={{ kind: "public", slug: book.publicSlug, title: book.title, sha256: book.sha256 }} backHref="/chess-books" />
    </div>
  );
}
