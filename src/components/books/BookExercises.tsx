"use client";

import Link from "next/link";

import { PageHeader } from "@/components/ui/PageHeader";
import { useBookOpened, type BookReaderKind } from "@/hooks/useBookOpened";
import { useT } from "@/hooks/useT";
import type { BookDetail } from "@/lib/books";

/**
 * An exercise book: what came out of it, what the book itself got wrong,
 * and every exercise to open. The same in the app (your books) and in the
 * guest trial (/chess-books/try); each says where an exercise lives.
 */
export function BookExercises({
  book,
  who,
  hrefFor,
  actions,
  above,
}: {
  book: BookDetail;
  /** Whose book it is, for the "Book opened" count. */
  who: BookReaderKind;
  hrefFor: (number: number) => string;
  /** Beside "Start solving": the app's PGN download. */
  actions?: React.ReactNode;
  /** Above the header: the trial's time left. */
  above?: React.ReactNode;
}) {
  const t = useT();
  useBookOpened(true, "exercises", who);
  const num = (x: number) => x.toLocaleString("en");
  const stopped = book.exercises.filter((e) => !e.verified);
  const first = book.exercises[0]?.number;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {above}
      <PageHeader
        title={book.title}
        subtitle={`${t.plural(book.exerciseCount, "{n} exercise", "{n} exercises", { n: num(book.exerciseCount) })} · ${t("{n} verified", { n: num(book.verifiedCount) })}`}
        actions={
          <>
            {first !== undefined && (
              <Link href={hrefFor(first)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                {t("Start solving")}
              </Link>
            )}
            {actions}
          </>
        }
      />

      {/* What the conversion found in the book itself, said plainly: a reader
          who meets exercise 11 should know it is the book, not us. */}
      {(book.renumbered.length > 0 || stopped.length > 0 || book.missingSolutions.length > 0) && (
        <section className="mb-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {book.renumbered.length > 0 && (
              <li>
                {t.plural(
                  book.renumbered.length,
                  "The book misprints an exercise number; corrected from the numbering: {list}.",
                  "The book misprints {n} exercise numbers; corrected from the numbering: {list}.",
                  { list: book.renumbered.map(([printed, actual]) => `${printed} → ${actual}`).join(", ") },
                )}
              </li>
            )}
            {stopped.length > 0 && (
              <li>
                {t.plural(
                  stopped.length,
                  "In one exercise the book's solution has a move its own diagram does not allow, so the solution stops there and the rest is kept as a note: {list}.",
                  "In {n} exercises the book's solution has a move its own diagram does not allow, so the solution stops there and the rest is kept as a note: {list}.",
                  { list: stopped.map((e) => `#${e.number}`).join(", ") },
                )}
              </li>
            )}
            {book.missingSolutions.length > 0 && (
              <li>{t("No solution was found for: {list}.", { list: book.missingSolutions.map((n) => `#${n}`).join(", ") })}</li>
            )}
          </ul>
        </section>
      )}

      <ol className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1.5">
        {book.exercises.map((e) => (
          <li key={e.number}>
            <Link
              href={hrefFor(e.number)}
              title={[`${e.white} – ${e.black}`, e.event, e.verified ? "" : t("solution stops early")].filter(Boolean).join(" · ")}
              className={`flex h-10 items-center justify-center rounded-lg text-sm tabular-nums ${
                e.verified
                  ? "bg-gray-100 text-gray-700 hover:bg-brand-50 hover:text-brand-700 dark:bg-dark-elevated dark:text-gray-300"
                  : "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200"
              }`}
            >
              {e.number}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
