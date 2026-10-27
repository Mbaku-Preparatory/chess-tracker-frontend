"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

let navigatedInApp = false;

/**
 * Whether this tab has moved between pages of the site since it loaded.
 *
 * A Back button on a page opened from a link inside the site should do what
 * the browser's back does. On a page someone landed on directly (a search
 * result, a shared link), "back" would leave the site, so the button goes to
 * the page it names instead. `history.length` cannot tell these apart: it
 * counts the pages before the site too.
 */
export function hasInAppHistory(): boolean {
  return navigatedInApp;
}

export function NavigationMemory() {
  const pathname = usePathname();
  const first = useRef(pathname);
  useEffect(() => {
    if (pathname !== first.current) navigatedInApp = true;
  }, [pathname]);
  return null;
}
