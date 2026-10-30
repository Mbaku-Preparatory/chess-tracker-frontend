"use client";

import type { Book } from "@/lib/books";

import { RetroProgress } from "./RetroProgress";

const n = (x: number) => x.toLocaleString("en");

/** A book being converted: the retro progress bar, the page it is on, and
 * what to do meanwhile (`note`: leave and come back, or an email is coming). */
export function BookConverting({ book, note }: { book: Book; note: string }) {
  const label =
    book.progress === null
      ? "Opening the book…"
      : book.pagesDone >= book.pageCount
        ? "Linking every move to its position…"
        : `Reading page ${n(book.pagesDone + 1)} of ${n(book.pageCount)}…`;
  return (
    <div className="mt-2 flex flex-col gap-1">
      <RetroProgress value={book.progress} label={label} />
      {book.progress !== null && <p className="text-[13px] text-gray-500 dark:text-gray-400">A scanned book takes a few minutes. {note}</p>}
    </div>
  );
}
