"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { demoBooks } from "@/lib/books";
import { bookPath } from "@/lib/publicBook";

type Demo = Awaited<ReturnType<typeof demoBooks>>[number];

/**
 * The Books page's "not sure what you'll get?" note under the upload: try the
 * reader on a demo book first, no upload needed.
 */
export function ReadABook() {
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
