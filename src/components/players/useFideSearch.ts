"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { PlayerLookupResult } from "@/types";

/**
 * Search FIDE for the home page's search box.
 *
 * FIDE is reached through a Cloudflare proxy (Railway cannot talk to
 * ratings.fide.com), so it is slower and more rate-limited than our own
 * database. Hence the debounce and the minimum query length: the local list
 * updates on every keystroke, this does not.
 */

const DEBOUNCE_MS = 450;
const MIN_NAME_CHARS = 3;
const MIN_ID_DIGITS = 4;

/** A query of only digits is a FIDE ID, and reads one profile directly. */
export function isIdQuery(q: string): boolean {
  return /^\d+$/.test(q.trim());
}

export function queryIsSearchable(q: string): boolean {
  const t = q.trim();
  return isIdQuery(t) ? t.length >= MIN_ID_DIGITS : t.length >= MIN_NAME_CHARS;
}

export function ratingOf(r: PlayerLookupResult): number | undefined {
  return r.ratings?.standard ?? r.ratings?.classical ?? r.ratings?.rapid ?? r.ratings?.blitz;
}

/** FIDE returns `federation`; the chess.com/lichess lookups return `country`. */
export function federationOf(r: PlayerLookupResult): string | undefined {
  return r.federation ?? r.country ?? undefined;
}

export function useFideSearch(query: string) {
  const [results, setResults] = useState<PlayerLookupResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow early request landing after a faster later one and
  // painting results for a query the user has already moved on from.
  const requestSeq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!queryIsSearchable(q)) {
      requestSeq.current++;
      setResults(null);
      setError(null);
      setSearching(false);
      return;
    }

    const seq = ++requestSeq.current;
    setSearching(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const { results } = await api.lookupPlayer("fide", q, isIdQuery(q) ? "id" : "name");
        if (seq !== requestSeq.current) return;
        setResults(results);
      } catch {
        if (seq !== requestSeq.current) return;
        // FIDE being unreachable must not break the box — your own opponents
        // are listed above it, which is the more important half.
        setError("Could not reach FIDE just now.");
        setResults(null);
      } finally {
        if (seq === requestSeq.current) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  return { results, searching, error };
}
