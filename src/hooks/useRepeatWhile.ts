import { useEffect, useRef } from "react";

/**
 * Calls `fn` every `ms` while `active`, for asking the server again about
 * something still in progress (a book being read). `fn` may change on every
 * render without restarting the timer: the latest one is called.
 */
export function useRepeatWhile(active: boolean, fn: () => void, ms: number): void {
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => latest.current(), ms);
    return () => window.clearInterval(timer);
  }, [active, ms]);
}
