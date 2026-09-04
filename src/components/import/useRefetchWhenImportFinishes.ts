"use client";

import { useEffect, useRef } from "react";

import { useActiveImports } from "./ActiveImportsProvider";

/**
 * Refetch a player's page when a background import for them finishes.
 *
 * Imports run in the worker, so nothing on the page knows the data underneath
 * it just changed. You would land on a profile, watch the pill in the corner
 * count up, and still be looking at "0 games" until you reloaded by hand —
 * worst exactly where it matters most, right after adding an opponent from
 * search, when the whole point is that their games arrive seconds later.
 *
 * ActiveImportsProvider is already polling "my active imports" every three
 * seconds for that pill, so this watches the list it maintains rather than
 * adding a second poller. A job for this player being present and then absent
 * is the finish signal — the endpoint only returns live work.
 */
export function useRefetchWhenImportFinishes(
  slug: string | undefined,
  refetch: () => void
) {
  const { jobs } = useActiveImports();
  const wasRunning = useRef(false);

  // Held in a ref so a parent that rebuilds this callback every render does
  // not retrigger the effect and refetch in a loop.
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  const running = !!slug && jobs.some((job) => job.player_slug === slug);

  useEffect(() => {
    if (running) {
      wasRunning.current = true;
      return;
    }
    if (wasRunning.current) {
      wasRunning.current = false;
      refetchRef.current();
    }
  }, [running]);
}
