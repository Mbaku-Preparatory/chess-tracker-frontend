"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BookExercises } from "@/components/books/BookExercises";
import { BookReader } from "@/components/books/BookReader";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { getBook, type BookDetail } from "@/lib/books";

/** A converted book: a reader book opens to read; an exercise book shows what
 * came out of it, and every exercise to open. */
export default function BookPage() {
  const { ref } = useParams<{ ref: string }>();
  const [book, setBook] = useState<BookDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBook(ref)
      .then((b) => !cancelled && setBook(b))
      .catch((err) => !cancelled && setError(userMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [ref]);

  if (error) return <p className="py-16 text-center text-sm text-red-600">{error}</p>;
  if (book === undefined) return <div className="mx-auto mt-8 h-40 max-w-4xl animate-pulse rounded-xl bg-gray-100 dark:bg-dark-elevated" />;
  if (book === null || book.status !== "succeeded") {
    return (
      <p className="py-16 text-center text-sm text-gray-500">
        This book is not ready. <Link href="/books" className="text-brand-600 underline">Back to your books</Link>
      </p>
    );
  }

  if (book.kind === "reader") return <BookReader source={{ kind: "own", book }} />;

  return (
    <BookExercises
      book={book}
      hrefFor={(n) => `/books/${ref}/${n}`}
      actions={
        <button
          type="button"
          onClick={() => void api.downloadBookPgn(ref).catch((err) => setError(userMessage(err)))}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-dark-border dark:text-gray-300 dark:hover:bg-dark-elevated"
        >
          Download PGN
        </button>
      }
    />
  );
}
