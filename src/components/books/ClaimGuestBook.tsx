"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { claimGuestBook } from "@/lib/books";
import { readGuestBook, writeGuestBook } from "@/lib/guestBook";
import { useAppSelector } from "@/redux/hooks";

/**
 * The book someone tried before signing up (lib/guestBook.ts), moved into
 * their account as soon as they are signed in, then opened.
 *
 * Keyed on the token, not run once on mount. Signing up and signing in are
 * client-side navigations inside this layout (/signup → /verify-email →
 * /home), so a mount-only check had already run, signed out, by the time they
 * were in: the book was claimed only on some later page load, and the server
 * deletes an unclaimed guest book after a day. Tested 2026-11-09: with the
 * trial tab closed, nothing was claimed until a reload.
 *
 * Opens the book once the tab is on /home or /books, where every sign-in and
 * the trial tab's own redirect land: anywhere else is a page the user chose.
 */
export function ClaimGuestBook() {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAppSelector((s) => s.auth.token);
  // The claimed book, waiting for the tab to reach /home or /books. The claim
  // usually answers on /verify-email, a moment before the sign-up moves on.
  const [toOpen, setToOpen] = useState<string | null>(null);
  // One claim at a time from this tab: the effect re-runs on every token
  // change (and twice in development).
  const claiming = useRef(false);

  useEffect(() => {
    if (!token || claiming.current) return;
    const trial = readGuestBook();
    if (!trial || trial.claimed) return;
    claiming.current = true;
    claimGuestBook(trial.publicId, trial.key)
      .then((book) => {
        // Null is a key that opens nothing now (expired, or claimed already,
        // perhaps by another tab): nothing left to claim either way.
        writeGuestBook({ ...trial, claimed: true });
        if (book) setToOpen(book.publicId);
      })
      .catch(() => {
        // Offline or the API down: asked again on the next sign-in or page load.
      })
      .finally(() => {
        claiming.current = false;
      });
  }, [token]);

  useEffect(() => {
    if (!toOpen || (pathname !== "/home" && pathname !== "/books")) return;
    setToOpen(null);
    router.replace(`/books/${toOpen}`);
  }, [toOpen, pathname, router]);

  return null;
}
