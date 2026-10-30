"use client";

import { useEffect, useState } from "react";

import { authStorage } from "@/lib/auth";

/**
 * Whether this browser has a session, for the public pages, whose server
 * render cannot know (the session lives in localStorage): null until the
 * client has looked, so the first render matches the server's.
 *
 * Kept up to date across tabs: log in and sign up open in a new tab from a
 * public page (components/public/AuthLink), and the page left behind should
 * notice when that tab signs in, without a reload.
 */
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const look = () => setSignedIn(Boolean(authStorage.getToken()));
    look();
    // Fired in every other tab of this site when localStorage changes.
    window.addEventListener("storage", look);
    return () => window.removeEventListener("storage", look);
  }, []);

  return signedIn;
}
