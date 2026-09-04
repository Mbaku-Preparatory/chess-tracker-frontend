"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import type { PlayerLookupResult } from "@/types";

/**
 * The second half of the home page search: players we do NOT have yet.
 *
 * The page searches your own opponents as you type; this searches FIDE for the
 * same string and offers to create a profile from a result. It runs alongside
 * the local search rather than only when the local search comes back empty —
 * searching "john" and matching one John you already added must not hide the
 * John you were actually looking for.
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
function isIdQuery(q: string): boolean {
  return /^\d+$/.test(q.trim());
}

function queryIsSearchable(q: string): boolean {
  const t = q.trim();
  return isIdQuery(t) ? t.length >= MIN_ID_DIGITS : t.length >= MIN_NAME_CHARS;
}

function ratingOf(r: PlayerLookupResult): number | undefined {
  return r.ratings?.standard ?? r.ratings?.classical ?? r.ratings?.rapid ?? r.ratings?.blitz;
}

export function FideSearchResults({
  query,
  ownedFideIds,
  onPlayerCreated,
}: {
  query: string;
  /** FIDE IDs already in the viewer's opponent list, so results can say so. */
  ownedFideIds: Set<string>;
  onPlayerCreated?: () => void;
}) {
  const router = useRouter();
  const [results, setResults] = useState<PlayerLookupResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Guards against a slow early request landing after a faster later one and
  // painting results for a query the user has already moved on from.
  const requestSeq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!queryIsSearchable(q)) {
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
        // FIDE being unreachable must not break the page — your own opponents
        // are still listed above, which is the more important half.
        setError("Could not reach FIDE just now.");
        setResults(null);
      } finally {
        if (seq === requestSeq.current) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const add = useCallback(
    async (result: PlayerLookupResult) => {
      const fideId = result.fide_id;
      if (!fideId || addingId) return;

      setAddingId(fideId);
      setError(null);
      try {
        // Open what we already hold rather than making a second copy of it.
        // This is not the duplicate-detection feature — it is the one case
        // that is free to check, because the ID is an exact key.
        const existing = await api.getPlayers(fideId);
        const match = existing.results.find((p) => p.fide_id === fideId);
        if (match) {
          router.push(`/players/${match.slug}`);
          return;
        }

        const player = await api.createPlayer({
          full_name: result.display_name,
          fide_id: fideId,
          federation: result.federation ?? result.country ?? undefined,
        });

        // Start pulling their games immediately, so the profile has something
        // on it by the time it finishes opening.
        try {
          await api.createCareerImportJob(player.slug, fideId);
        } catch {
          // The profile exists either way; let them import by hand rather than
          // stranding a half-made player behind an error.
        }

        onPlayerCreated?.();
        router.push(`/players/${player.slug}`);
      } catch (err) {
        const message =
          (err as { body?: { detail?: string } })?.body?.detail ??
          (err as Error)?.message ??
          "Could not add this player.";
        setError(message);
      } finally {
        setAddingId(null);
      }
    },
    [addingId, onPlayerCreated, router]
  );

  if (!queryIsSearchable(query)) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">From FIDE</h2>
        {results && results.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-dark-elevated dark:text-gray-400">
            {results.length}
          </span>
        )}
        {searching && (
          <span className="text-xs text-gray-400 dark:text-gray-500">searching…</span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
        Not in your list yet. Adding one creates the profile and starts importing their games.
      </p>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!searching && results?.length === 0 && !error && (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No FIDE player matches “{query.trim()}”.
        </p>
      )}

      {results && results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((r) => {
            const fideId = r.fide_id ?? "";
            const owned = ownedFideIds.has(fideId);
            const busy = addingId === fideId;
            const rating = ratingOf(r);

            return (
              <li key={fideId || r.display_name}>
                <button
                  type="button"
                  onClick={() => add(r)}
                  disabled={busy || !!addingId}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-brand-400 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:border-dark-border dark:bg-dark-surface dark:hover:border-brand-500 dark:hover:bg-brand-900/20"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500 dark:bg-dark-muted dark:text-gray-400">
                    {r.display_name.charAt(0).toUpperCase()}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {r.title && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">
                          {r.title}
                        </span>
                      )}
                      <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
                        {r.display_name}
                      </span>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-gray-500 dark:text-gray-400">
                      {(r.federation ?? r.country) && <span>{r.federation ?? r.country}</span>}
                      {fideId && <span>FIDE #{fideId}</span>}
                      {rating != null && <span>{rating}</span>}
                    </span>
                  </span>

                  <span className="shrink-0 text-sm font-semibold text-brand-600 dark:text-brand-400">
                    {busy ? "Adding…" : owned ? "Open" : "+ Add"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
