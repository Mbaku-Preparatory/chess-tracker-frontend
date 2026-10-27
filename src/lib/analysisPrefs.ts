"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The analysis board's settings, remembered in this browser. They will move
 * to the account when the settings page exists; until then a browser that
 * blocks storage simply gets the defaults every time.
 *
 * The engine is off by default: a player preparing often wants to look at a
 * game without being told the answer, and on a phone the engine costs battery.
 */
export type EngineDepth = "quick" | "standard" | "deep";

export interface AnalysisPrefs {
  engine: boolean;
  depth: EngineDepth;
}

export const DEFAULT_PREFS: AnalysisPrefs = { engine: false, depth: "standard" };

/** Depth to search to, and a time cap so a phone is never stuck on "Deep". */
export const DEPTHS: Record<EngineDepth, { label: string; depth: number; capMs: number }> = {
  quick: { label: "Quick", depth: 12, capMs: 3_000 },
  standard: { label: "Standard", depth: 18, capMs: 8_000 },
  deep: { label: "Deep", depth: 24, capMs: 20_000 },
};

const KEY = "analysis-prefs";
const listeners = new Set<() => void>();
let cached: AnalysisPrefs | null = null;

function read(): AnalysisPrefs {
  if (cached) return cached;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    cached = {
      engine: typeof stored.engine === "boolean" ? stored.engine : DEFAULT_PREFS.engine,
      depth: stored.depth in DEPTHS ? stored.depth : DEFAULT_PREFS.depth,
    };
  } catch {
    cached = DEFAULT_PREFS;
  }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changing the settings.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cached = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAnalysisPrefs(): [AnalysisPrefs, (change: Partial<AnalysisPrefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS);
  const update = useCallback((change: Partial<AnalysisPrefs>) => {
    cached = { ...read(), ...change };
    try {
      localStorage.setItem(KEY, JSON.stringify(cached));
    } catch {
      // Storage blocked: the change still applies until the page is closed.
    }
    listeners.forEach((l) => l());
  }, []);
  return [prefs, update];
}
