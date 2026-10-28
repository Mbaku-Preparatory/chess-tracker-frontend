"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { authStorage } from "@/lib/auth";

/**
 * Log in / Get started, or Open app for someone already signed in
 * (`primaryOnly`: just Get started / Open app).
 *
 * A client component because the session lives in localStorage, which the
 * server cannot see. It renders the signed-out links first, so the server's
 * HTML and the first client render agree, then swaps once it has looked.
 */
export function AccountLinks({ primaryOnly = false }: { primaryOnly?: boolean }) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(authStorage.getToken()));
  }, []);

  if (signedIn) {
    return (
      <Link href="/home" className="whitespace-nowrap rounded-pill bg-accent px-5 py-2 text-[15px] font-[480] text-accent-on hover:bg-accent-soft">
        Open app
      </Link>
    );
  }
  // On a phone the bar keeps only the main button; Log in is in the menu.
  if (primaryOnly) {
    return (
      <Link href="/signup" className="whitespace-nowrap rounded-pill bg-accent px-4 py-2 text-[15px] font-[480] text-accent-on hover:bg-accent-soft">
        Get started
      </Link>
    );
  }
  return (
    <nav className="flex items-center gap-2">
      <Link href="/login" className="whitespace-nowrap rounded-pill px-3 py-2 text-[15px] text-ink-text hover:bg-ink-raised sm:px-4">
        Log in
      </Link>
      <Link href="/signup" className="whitespace-nowrap rounded-pill bg-accent px-4 py-2 text-[15px] font-[480] text-accent-on hover:bg-accent-soft sm:px-5">
        Get started
      </Link>
    </nav>
  );
}
