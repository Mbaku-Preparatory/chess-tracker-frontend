"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ImportJob } from "@/types";
import { userMessage } from "@/lib/apiError";
import { useActiveImports } from "./ActiveImportsProvider";

const POLL_INTERVAL_MS = 2000;

export function isTerminal(job: ImportJob): boolean {
  return job.status === "succeeded" || job.status === "failed" || job.status === "cancelled";
}

interface UseImportJobOptions {
  slug: string;
  /** Called once, when a job reaches a terminal state. */
  onSettled?: (job: ImportJob) => void | Promise<void>;
  /**
   * Only reconnect to a job this component started. A player can have a
   * chess-results import running while the Chess.com panel sits idle, and each
   * panel should show its own work rather than each other's.
   */
  matches?: (job: ImportJob) => boolean;
}

/**
 * Follow one background import.
 *
 * The imports themselves moved to the worker service, so a component no longer
 * awaits a result — it holds a job id and polls. That buys the thing the old
 * synchronous call could not do: a coach can close the tab mid-import, come
 * back, and still see it running. Nothing in component state survives that,
 * which is why this reconnects on mount rather than only tracking jobs it
 * started itself.
 */
export function useImportJob({ slug, onSettled, matches }: UseImportJobOptions) {
  const [job, setJob] = useState<ImportJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refresh: refreshActiveImports } = useActiveImports();

  // Held in refs so the polling effect does not restart every time the parent
  // re-renders and hands down a new function identity.
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const matchesRef = useRef(matches);
  matchesRef.current = matches;
  const refreshRef = useRef(refreshActiveImports);
  refreshRef.current = refreshActiveImports;

  const activeJobId = job && !isTerminal(job) ? job.id : null;

  // ── Reconnect to an import already in progress ────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { results } = await api.recentImportJobs(slug);
        if (cancelled) return;
        const live = results.find(
          (j) => !isTerminal(j) && (matchesRef.current?.(j) ?? true),
        );
        if (live) setJob(live);
      } catch {
        // Nothing to reconnect to is the normal case; a failed lookup here
        // must not stop someone starting a fresh import.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ── Poll while it runs ────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeJobId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const fresh = await api.getImportJob(activeJobId);
        if (cancelled) return;
        setJob(fresh);
        if (isTerminal(fresh)) {
          await onSettledRef.current?.(fresh);
          refreshRef.current();
          return; // stop polling
        }
      } catch {
        if (cancelled) return;
        // A failed poll is usually a blip. Keep polling rather than declaring
        // an import dead that is very likely still running.
      }
      if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeJobId]);

  /** Queue an import. `starter` is the api call that returns the new job. */
  const start = useCallback(
    async (starter: () => Promise<ImportJob>, fallbackMessage: string) => {
      setStarting(true);
      setError(null);
      setJob(null);
      try {
        const fresh = await starter();
        setJob(fresh);
        refreshRef.current();
        return fresh;
      } catch (err) {
        setError(userMessage(err, fallbackMessage));
        return null;
      } finally {
        setStarting(false);
      }
    },
    [],
  );

  const cancel = useCallback(async () => {
    if (!activeJobId) return;
    try {
      setJob(await api.cancelImportJob(activeJobId));
      refreshRef.current();
    } catch (err) {
      setError(userMessage(err, "Could not cancel the import."));
    }
  }, [activeJobId]);

  const reset = useCallback(() => {
    setJob(null);
    setError(null);
  }, []);

  return { job, starting, error, start, cancel, reset, isRunning: Boolean(activeJobId) };
}
