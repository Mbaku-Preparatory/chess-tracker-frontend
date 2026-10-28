"use client";

/**
 * Books: a chess book PDF in. A book typeset in a chess font comes out as
 * exercises to solve; any other (a scan, usually) as a reader, where every
 * move in the owner's own PDF opens on the board. Private to the account
 * that uploaded it.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { RetroProgress } from "@/components/books/RetroProgress";
import { NotifyMeCheckbox } from "@/components/ui/NotifyMeCheckbox";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { forgetBookFile, keepBookFile, sha256Of } from "@/lib/bookFiles";
import { deleteBook, isConverting, myBooks, type Book } from "@/lib/books";

const POLL_MS = 3000;

const n = (x: number) => x.toLocaleString("en");

function status(book: Book): string {
  if (book.status === "failed") return book.error || "This book could not be converted.";
  if (book.kind === "reader") return `Reader · ${n(book.diagramCount)} diagrams · ${n(book.moveCount)} moves`;
  return `${n(book.exerciseCount)} exercises · ${n(book.verifiedCount)} verified`;
}

function Converting({ book }: { book: Book }) {
  const label =
    book.progress === null
      ? "Opening the book…"
      : book.pagesDone >= book.pageCount
        ? "Linking every move to its position…"
        : `Reading page ${n(book.pagesDone + 1)} of ${n(book.pageCount)}…`;
  return (
    <div className="mt-2 flex flex-col gap-1">
      <RetroProgress value={book.progress} label={label} />
      {book.progress !== null && (
        <p className="text-[13px] text-gray-500 dark:text-gray-400">
          A scanned book takes a few minutes.{" "}
          {book.notifyEmail ? "You can leave this page: we'll email you when it's done." : "You can leave this page and come back."}
        </p>
      )}
    </div>
  );
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The same file uploaded again: not an error, but worth a word.
  const [already, setAlready] = useState<{ publicId: string; title: string; ready: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
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
    setAlready(null);
    try {
      // A reader book is read over this copy: the server deletes its own.
      void sha256Of(file).then((sha) => keepBookFile(sha, file));
      const result = await api.uploadBook(file, { notifyEmail });
      if (result.duplicate) setAlready({ publicId: result.public_id, title: result.title, ready: result.status === "succeeded" });
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
      if (book.sha256) await forgetBookFile(book.sha256);
      await load();
    } catch (err) {
      setError(userMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Books"
        subtitle="Upload a chess book as a PDF. A book of exercises becomes positions to solve, with the book's solutions and notes; any other book, scanned ones too, becomes a reader where every move opens on the board. Your books are private to you."
      />

      <section className="mb-8 rounded-xl border border-dashed border-gray-300 p-6 dark:border-dark-border">
        <label className="flex cursor-pointer flex-col items-start gap-3 sm:flex-row sm:items-center">
          <span className="shrink-0 whitespace-nowrap rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            {uploading ? "Uploading…" : "Upload a PDF"}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Up to 50 MB. A scanned book is read where it is: it stays on this device, and the server keeps only where
            its moves and diagrams are.
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
        <div className="mt-4 max-w-md">
          <NotifyMeCheckbox
            checked={notifyEmail}
            onChange={setNotifyEmail}
            hint="A scanned book takes a few minutes to read; we'll send a link when it's ready."
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {already && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            You already have this book as “{already.title}”.{" "}
            {already.ready ? (
              <Link href={`/books/${already.publicId}`} className="text-brand-600 underline">Open it</Link>
            ) : (
              "It is still being converted."
            )}
          </p>
        )}
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
              <div className="min-w-0 flex-1">
                {book.status === "succeeded" ? (
                  <Link href={`/books/${book.publicId}`} className="font-semibold text-gray-900 hover:text-brand-600 dark:text-gray-100">
                    {book.title}
                  </Link>
                ) : (
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{book.title}</span>
                )}
                {isConverting(book) ? (
                  <Converting book={book} />
                ) : (
                  <p className={`mt-0.5 text-sm ${book.status === "failed" ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
                    {status(book)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {book.status === "succeeded" && (
                  <>
                    <Link href={`/books/${book.publicId}`} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
                      {book.kind === "reader" ? "Read" : "Open"}
                    </Link>
                    {book.kind === "exercises" && (
                      <button
                        type="button"
                        onClick={() => void api.downloadBookPgn(book.publicId).catch((err) => setError(userMessage(err)))}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-dark-border dark:text-gray-300 dark:hover:bg-dark-elevated"
                      >
                        Download PGN
                      </button>
                    )}
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
