"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { BookConverting } from "@/components/books/BookConverting";
import { BookExercises } from "@/components/books/BookExercises";
import { BookReader } from "@/components/books/BookReader";
import { authStorage } from "@/lib/auth";
import { keepBookFile } from "@/lib/bookFiles";
import { getBook, isConverting, type BookDetail } from "@/lib/books";
import { forgetGuestBook, readGuestBook, TRIAL_MS, uploadGuestBook, writeGuestBook, type GuestBook } from "@/lib/guestBook";

import { TrialBar, TrialOver, useTrialClock } from "./trial";

const POLL_MS = 3000;
const n = (x: number) => x.toLocaleString("en");

/**
 * Trying the books feature with your own book, no account: like the bot's
 * free game, one per device. Upload, wait while the first 50 pages are read,
 * then ten minutes with it; after that, an account keeps it (lib/guestBook.ts
 * has the arrangement). Signed in, the app's Books page is the real thing.
 */
export function GuestBookTrial() {
  const router = useRouter();
  // undefined until this device's record is read, on the client
  const [trial, setTrial] = useState<GuestBook | null | undefined>(undefined);
  const [book, setBook] = useState<BookDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (authStorage.getToken()) {
      router.replace("/books");
      return;
    }
    setTrial(readGuestBook());
  }, [router]);

  const load = useCallback(async (t: GuestBook) => {
    try {
      setBook(await getBook(t.publicId, t.key));
    } catch {
      setError("Couldn't reach the server just now. This page will keep trying.");
    }
  }, []);

  useEffect(() => {
    if (trial && !trial.claimed) void load(trial);
  }, [trial, load]);

  // While it is being read, ask again every few seconds.
  const converting = book ? isConverting(book) : false;
  useEffect(() => {
    if (!trial || !converting) return;
    const timer = window.setInterval(() => void load(trial), POLL_MS);
    return () => window.clearInterval(timer);
  }, [trial, converting, load]);

  // A book that could not be read doesn't use up the try: forget it.
  const failed = book?.status === "failed";
  useEffect(() => {
    if (failed) forgetGuestBook();
  }, [failed]);

  const ready = book?.status === "succeeded";
  const used = useTrialClock(trial ?? null, ready);

  async function upload(file: File) {
    const controller = new AbortController();
    uploadRef.current = controller;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadGuestBook(file, controller.signal);
      // The reader reads this copy: the server keeps only where the moves are.
      await keepBookFile(result.sha256, file);
      const fresh = { publicId: result.public_id, key: result.guest_key, title: result.title, sha256: result.sha256, usedMs: 0 };
      writeGuestBook(fresh);
      setBook(undefined);
      setTrial(fresh);
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "The book could not be uploaded.");
    } finally {
      uploadRef.current = null;
      setUploading(false);
    }
  }

  if (trial === undefined) return <div className="h-40 animate-pulse rounded-xl bg-ink-card" />;

  if (trial?.claimed) {
    return (
      <Notice title={`“${trial.title}” is in your account.`}>
        <Link href="/login" className="rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft">
          Log in to read it
        </Link>
      </Notice>
    );
  }

  // No try yet on this device, or the last one couldn't be read.
  if (!trial || failed) {
    return (
      <section aria-label="Try it with your book" className="flex flex-col items-start gap-5 rounded-xl bg-ink-card p-6 sm:p-8">
        <h2 className="text-[24px] font-[480] leading-tight">Try it with your own book</h2>
        <p className="max-w-[60ch] text-[16px] leading-[1.5] text-ink-muted">
          Upload a chess book as a PDF, scanned or not. No account needed: we read the first 50 pages, and you have ten
          minutes with it. The book stays on your device; the server keeps only where its moves and diagrams are.
        </p>
        {failed && book && (
          <p className="max-w-[60ch] text-[15px] text-amber-700 dark:text-amber-400">
            “{book.title}” couldn&apos;t be read: {book.error || "it doesn't look like a chess book."} Try another.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft">
            {uploading ? "Uploading…" : "Choose a PDF"}
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(file);
              }}
            />
          </label>
          {uploading && (
            <button type="button" onClick={() => uploadRef.current?.abort()} className="text-[14px] text-ink-muted underline">
              Cancel
            </button>
          )}
          <span className="text-[13px] text-ink-faint">Up to 50 MB · one book per device</span>
        </div>
        {error && <p className="text-[14px] text-result-loss">{error}</p>}
      </section>
    );
  }

  // Deleted on the server: unclaimed guest books go after a day.
  if (book === null) {
    return (
      <Notice title={`“${trial.title}” was only kept for a day.`}>
        <Link href="/signup" className="rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft">
          Create a free account to upload books
        </Link>
      </Notice>
    );
  }

  if (book === undefined) return <div className="h-40 animate-pulse rounded-xl bg-ink-card" />;

  if (converting) {
    return (
      <section aria-label="Reading your book" aria-live="polite" className="flex flex-col gap-3 rounded-xl bg-ink-card p-6 sm:p-8">
        <h2 className="text-[21px] font-[480]">Reading “{book.title}”</h2>
        <BookConverting book={book} note="Your ten minutes start when it's ready, not before. You can leave this page and come back." />
        {error && <p className="text-[14px] text-ink-faint">{error}</p>}
      </section>
    );
  }

  // Before the clock's first read, what this device saved.
  const usedMs = used ?? trial.usedMs;
  if (usedMs >= TRIAL_MS) return <TrialOver title={book.title} />;

  const bar = <TrialBar used={usedMs} />;
  if (book.kind === "exercises") return <BookExercises book={book} hrefFor={(num) => `/chess-books/try/${num}`} above={bar} />;
  return (
    <BookReader
      source={{ kind: "guest", publicId: book.publicId, key: trial.key, title: book.title, sha256: book.sha256 }}
      backHref="/chess-books"
      above={bar}
      partNote={
        <>
          That&apos;s as far as a free try reads: the first {n(book.pageCount)} of {n(book.pdfPageCount)} pages.{" "}
          <Link href="/signup" className="text-accent-soft underline">
            Create a free account
          </Link>{" "}
          and the book moves into it; read the whole of it from there.
        </>
      }
    />
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-xl bg-ink-card p-6 sm:p-8">
      <h2 className="text-[24px] font-[480] leading-tight">{title}</h2>
      <div className="flex flex-wrap gap-3">{children}</div>
    </section>
  );
}
