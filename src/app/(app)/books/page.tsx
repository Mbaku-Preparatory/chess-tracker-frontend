"use client";

/**
 * Books: a chess book PDF in, every exercise out as a position to solve, with
 * the book's solution and notes. Private to the account that uploaded it.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { deleteBook, isConverting, myBooks, type Book } from "@/lib/books";

const POLL_MS = 3000;

function status(book: Book): string {
  if (isConverting(book)) return "Converting… this takes about half a minute.";
  if (book.status === "failed") return book.error || "This book could not be converted.";
  return `${book.exerciseCount.toLocaleString("en")} exercises · ${book.verifiedCount.toLocaleString("en")} verified`;
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setBooks(await myBooks());
    } catch (err) {
      setError(userMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // While a book converts, ask again every few seconds.
  const converting = books?.some(isConverting) ?? false;
  useEffect(() => {
    if (!converting) return;
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [converting, load]);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      await api.uploadBook(file);
      await load();
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(book: Book) {
    if (!window.confirm(`Delete “${book.title}” and its exercises?`)) return;
    try {
      await deleteBook(book.publicId);
      await load();
    } catch (err) {
      setError(userMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Books"
        subtitle="Upload a chess book as a PDF and get every exercise as a position to solve, with the book's solution and notes. Your books are private to you."
      />

      <section className="mb-8 rounded-xl border border-dashed border-gray-300 p-6 dark:border-dark-border">
        <label className="flex cursor-pointer flex-col items-start gap-3 sm:flex-row sm:items-center">
          <span className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            {uploading ? "Uploading…" : "Upload a PDF"}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Works with books whose diagrams are text, which is most modern ones. Scanned books are not supported yet. Up
            to 50 MB.
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>

      {books === null ? (
        <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-dark-elevated" />
      ) : books.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No books yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {books.map((book) => (
            <li
              key={book.publicId}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-dark-border sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                {book.status === "succeeded" ? (
                  <Link href={`/books/${book.publicId}`} className="font-semibold text-gray-900 hover:text-brand-600 dark:text-gray-100">
                    {book.title}
                  </Link>
                ) : (
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{book.title}</span>
                )}
                <p
                  className={`mt-0.5 text-sm ${
                    book.status === "failed" ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
                  } ${isConverting(book) ? "animate-pulse" : ""}`}
                >
                  {status(book)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {book.status === "succeeded" && (
                  <>
                    <Link href={`/books/${book.publicId}`} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
                      Open
                    </Link>
                    <button
                      type="button"
                      onClick={() => void api.downloadBookPgn(book.publicId).catch((err) => setError(userMessage(err)))}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-dark-border dark:text-gray-300 dark:hover:bg-dark-elevated"
                    >
                      Download PGN
                    </button>
                  </>
                )}
                {!isConverting(book) && (
                  <button
                    type="button"
                    onClick={() => void remove(book)}
                    className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
