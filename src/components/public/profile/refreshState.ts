"use client";

import { useSyncExternalStore } from "react";

/**
 * Where a profile's missing games stand, shared by ProfileRefresher (which
 * knows) and the placeholder (which says so). Without it the placeholder could
 * only ever say "Fetching…", and that is what search engines stored: a
 * crawler's refresh is refused, so for them nothing is ever fetched.
 *
 * "waiting": what the server renders, before the browser has asked; also all a
 *   crawler that runs no scripts ever sees.
 * "fetching": a refresh was accepted and is running.
 * "unavailable": the refresh was refused, failed, gave up, or finished
 *   without the games.
 */
export type GamesStatus = "waiting" | "fetching" | "unavailable";

let state: GamesStatus = "waiting";
const listeners = new Set<() => void>();

export function setGamesStatus(status: GamesStatus) {
  state = status;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGamesStatus(): GamesStatus {
  return useSyncExternalStore(subscribe, () => state, () => "waiting");
}
