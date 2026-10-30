/**
 * Trying the books feature without an account, from /chess-books/try.
 *
 * Like the bot's free game (components/public/bot/PublicBot.tsx), the limits
 * live on this device: one book, read for TRIAL_MS. The server's side
 * (books/views.py on the backend) is the key: the upload answers with a
 * secret that is the only way back to the book, kept here and sent as the
 * X-Book-Key header. The server reads only the first 50 pages of a scan,
 * deletes the book after a day, and moves it into an account when someone
 * signs up holding the key (claimGuestBook, components/books/ClaimGuestBook).
 */

import type { ReaderIndex } from "./books";
import { BACKEND_ORIGIN } from "./site";

/** Ten minutes of reading, counted only while the book is on screen. */
export const TRIAL_MS = 10 * 60 * 1000;

const KEY = "cs_guest_book";

export interface GuestBook {
  publicId: string;
  key: string;
  title: string;
  sha256: string;
  /** Reading time used so far. */
  usedMs: number;
  /** Moved into an account: the key opens nothing now. */
  claimed?: boolean;
}

export function readGuestBook(): GuestBook | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GuestBook) : null;
  } catch {
    return null;
  }
}

export function writeGuestBook(book: GuestBook) {
  try {
    localStorage.setItem(KEY, JSON.stringify(book));
  } catch {
    // Private mode or blocked storage: the trial still runs, it just isn't remembered.
  }
}

/** Forgotten, so another can be tried: only for a book that failed to convert. */
export function forgetGuestBook() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to forget
  }
}

const GUEST_URL = `${BACKEND_ORIGIN}/api/books/guest/`;

/** The server's own words when it says no (not a PDF, too big, too many today). */
async function failure(response: Response, fallback: string): Promise<Error> {
  if (response.status === 429) return new Error("Too many books have been tried from this connection today. Create a free account to upload more.");
  const body = await response.json().catch(() => null);
  return new Error(body?.detail ?? fallback);
}

export async function uploadGuestBook(file: File, signal?: AbortSignal): Promise<{ public_id: string; title: string; sha256: string; guest_key: string }> {
  const body = new FormData();
  body.append("file", file);
  let response: Response;
  try {
    response = await fetch(GUEST_URL, { method: "POST", body, signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new Error("The upload didn't get through. Check your connection and try again.");
  }
  if (!response.ok) throw await failure(response, "The book could not be uploaded. Try again in a moment.");
  return response.json();
}

/** A reader book's index; sent gzipped, which the browser undoes. */
export async function guestBookReader(publicId: string, key: string): Promise<ReaderIndex> {
  const response = await fetch(`${GUEST_URL}${encodeURIComponent(publicId)}/reader/`, { headers: { "X-Book-Key": key } });
  if (!response.ok) throw new Error(response.status === 404 ? "This book is no longer available." : "The book could not be loaded. Try again in a moment.");
  return response.json();
}
