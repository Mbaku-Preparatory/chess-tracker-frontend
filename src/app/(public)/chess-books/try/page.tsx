import type { Metadata } from "next";
import Link from "next/link";

import { GuestBookTrial } from "@/components/public/books/GuestBookTrial";
import { T } from "@/components/T";

export const metadata: Metadata = {
  title: "Try it with your own chess book | Chess Preparatory",
  description: "Upload a chess book as a PDF and read it with a board beside the page. No account needed for a ten-minute try.",
  alternates: { canonical: "/chess-books/try" },
  // A tool for whoever is holding the book, not a page to land on from a search.
  robots: { index: false },
};

/** The guest trial (components/public/books/GuestBookTrial.tsx). */
export default function TryABookPage() {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <nav className="text-[14px] text-ink-faint">
        <Link href="/chess-books" className="hover:text-ink-muted"><T>{"Chess books"}</T></Link>
        <span className="mx-2">/</span>
        <span><T>{"Try your own book"}</T></span>
      </nav>
      <GuestBookTrial />
    </div>
  );
}
