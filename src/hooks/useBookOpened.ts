import { track } from "@vercel/analytics";
import { useEffect, useRef } from "react";

import type { BookKind } from "@/lib/books";

/** Whose book it is: an account's, a guest's trial, or a demo book anyone can read. */
export type BookReaderKind = "account" | "guest" | "demo";

/**
 * One "Book opened" event in Vercel Analytics (Analytics → Events) when a
 * book is on screen to read or solve: once per visit to it, not per page
 * turned. Visitors against the total, over the weeks, says whether people
 * come back to their books. Nothing about the book itself is sent, only its
 * kind and whose it is.
 */
export function useBookOpened(ready: boolean, kind: BookKind, who: BookReaderKind): void {
  const sent = useRef(false);
  useEffect(() => {
    if (!ready || sent.current) return;
    sent.current = true;
    track("Book opened", { kind, who });
  }, [ready, kind, who]);
}
