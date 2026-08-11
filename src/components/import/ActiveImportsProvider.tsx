"use client";

/**
 * Keeps track of imports running anywhere in the app.
 *
 * The import page has its own poller, but it dies the moment you navigate
 * away — which is exactly when a background import stops being visible. This
 * provider lives in the root layout, so it keeps polling across navigation and
 * lets the pill in the corner report progress from any page.
 *
 * It polls a single "my active imports" endpoint rather than one job at a
 * time, so the cost is one request every few seconds no matter how many
 * imports are in flight.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "@/lib/api";
import { useAppSelector } from "@/redux/hooks";
import type { ActiveImportJob } from "@/types";

const POLL_INTERVAL_MS = 3000;

interface ActiveImportsValue {
  jobs: ActiveImportJob[];
  /** Nudge the poller — call after starting or cancelling an import. */
  refresh: () => void;
}

const ActiveImportsContext = createContext<ActiveImportsValue>({
  jobs: [],
  refresh: () => {},
});

export function useActiveImports() {
  return useContext(ActiveImportsContext);
}

export function ActiveImportsProvider({ children }: { children: React.ReactNode }) {
  // /privacy is readable signed out — Google Play's reviewers open it with no
  // account — so this provider does render for anonymous visitors. Polling an
  // authenticated endpoint from there is a 401 every three seconds forever.
  const token = useAppSelector((s) => s.auth.token);

  const [jobs, setJobs] = useState<ActiveImportJob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const { results } = await api.activeImportJobs();
      if (!stoppedRef.current) setJobs(results);
    } catch {
      // Signed out, offline, backend down — none of it is worth surfacing for
      // a background indicator. Keep the last known state and try again.
    }
  }, []);

  const schedule = useCallback(
    (delay: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await poll();
        if (!stoppedRef.current) schedule(POLL_INTERVAL_MS);
      }, delay);
    },
    [poll]
  );

  const refresh = useCallback(() => schedule(0), [schedule]);

  useEffect(() => {
    if (!token) {
      setJobs([]);
      return;
    }
    stoppedRef.current = false;
    void poll();
    schedule(POLL_INTERVAL_MS);

    // Polling a hidden tab is wasted battery on a phone, and a coach who
    // switches back wants current numbers immediately rather than in three
    // seconds' time.
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token, poll, schedule, refresh]);

  return (
    <ActiveImportsContext.Provider value={{ jobs, refresh }}>
      {children}
    </ActiveImportsContext.Provider>
  );
}
