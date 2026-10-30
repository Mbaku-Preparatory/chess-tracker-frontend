"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { authStorage } from "@/lib/auth";
import { claimGuestBook } from "@/lib/books";
import { readGuestBook, writeGuestBook } from "@/lib/guestBook";

/**
 * The book someone tried before signing up (lib/guestBook.ts), moved into
 * their account the first time the app loads with them signed in. Signing up
 * and logging in both land on /home: from there, straight to the book.
 */
export function ClaimGuestBook() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const trial = readGuestBook();
    if (!trial || trial.claimed || !authStorage.getToken()) return;
    claimGuestBook(trial.publicId, trial.key)
      .then((book) => {
        // Null is a key that opens nothing now (expired, or claimed on
        // another visit): nothing left to claim either way.
        writeGuestBook({ ...trial, claimed: true });
        if (book && pathname === "/home") router.replace(`/books/${book.publicId}`);
      })
      .catch(() => {
        // Offline or the API down: asked again on the next visit.
      });
    // Once, when the app opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
