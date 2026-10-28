"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { demoBooks } from "@/lib/books";
import { bookPath } from "@/lib/publicBook";

type Demo = Awaited<ReturnType<typeof demoBooks>>[number];

/**
 * The way into books from inside the app: upload one, or try the reader on
 * a demo book first. On the dashboard as a card beside the opponents; on
 * the books page as the "not sure what you'll get?" note under the upload.
 */
export function ReadABook({ variant }: { variant: "dashboard" | "books" }) {
  const [demo, setDemo] = useState<Demo | null>(null);

  useEffect(() => {
    let cancelled = false;
    demoBooks().then((books) => !cancelled && setDemo(books[0] ?? null));
    return () => {
      cancelled = true;
    };
  }, []);

  const tryIt = demo && (
    <Link
      href={bookPath(demo.publicSlug)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-dark-border dark:text-gray-300 dark:hover:bg-dark-elevated"
    >
      Try it on <span className="font-semibold">{demo.title}</span>
    </Link>
  );

  if (variant === "books") {
    if (!demo) return null;
    return (
      <section className="mb-8 flex flex-col gap-3 rounded-xl bg-gray-50 p-5 dark:bg-dark-elevated/50 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Not sure what you&apos;ll get?</p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {demo.title} is read with the same reader: {demo.pageCount.toLocaleString("en")} pages, every one of its{" "}
            {demo.moveCount.toLocaleString("en")} moves on the board. No upload needed.
          </p>
        </div>
        <div className="shrink-0">{tryIt}</div>
      </section>
    );
  }

  return (
    <section
      aria-label="Books"
      className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-dark-border dark:bg-dark-surface sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-4">
        <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-2xl dark:bg-brand-900/30">
          📖
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">Books</p>
          <h2 className="mt-0.5 text-lg font-bold text-gray-900 dark:text-gray-100">Read a book with a board</h2>
          <p className="mt-0.5 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            Upload a chess book as a PDF, scans included, and every move and diagram in it opens on the board. A book of
            exercises becomes puzzles to solve.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        <Link href="/books" className="btn-primary px-3 py-1.5 text-sm">
          Upload a PDF
        </Link>
        {tryIt}
      </div>
    </section>
  );
}
