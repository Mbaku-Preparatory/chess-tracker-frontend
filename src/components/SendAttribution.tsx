"use client";

import { useEffect } from "react";

import { api } from "@/lib/api";
import { captureAttribution, markAttributionSent, unsentAttribution } from "@/lib/attribution";
import { useAppSelector } from "@/redux/hooks";

/**
 * Hands the visit's source to the account once somebody is signed in
 * (backend: POST /api/auth/signup-source/), whichever way they signed in.
 * The server keeps it only for an account made in the last day, and only the
 * first time, so sending for an existing user is harmless; after any answer it
 * is marked sent and never asked again. A failed request tries again on the
 * next page load.
 *
 * Keyed on the token, like ResumePrepare: signing in happens inside this
 * layout without a page load.
 */
export function SendAttribution() {
  const token = useAppSelector((s) => s.auth.token);

  useEffect(() => {
    if (!token) return;
    // This effect can run before the root layout's capture on the same load
    // (children's effects run first), so make sure the note exists.
    captureAttribution();
    const attribution = unsentAttribution();
    if (!attribution) return;
    api
      .recordSignupSource(attribution)
      .then(markAttributionSent)
      .catch(() => {
        // Offline or the API down: tried again on the next visit.
      });
  }, [token]);

  return null;
}
