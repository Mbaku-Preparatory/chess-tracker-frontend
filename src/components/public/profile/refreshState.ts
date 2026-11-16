"use client";

import { useSyncExternalStore } from "react";

/**
 * Where a profile's missing part stands, shared by ProfileRefresher (which
 * knows) and the placeholders (which say so). Without it a placeholder could
 * only ever say "Fetching…", and that is what search engines stored: a crawler's
 * refresh is refused, so for them nothing is ever fetched, and a part FIDE
 * refuses stays missing for everyone.
 *
 * "waiting": what the server renders, before the browser has asked; also all a
 *   crawler that runs no scripts ever sees.
 * "fetching": a refresh was accepted and is running.
 * "unavailable": the refresh was refused, failed, gave up, or finished without
 *   this part.
 */
export type PartStatus = "waiting" | "fetching" | "unavailable";
export type ProfilePart = "history" | "games";

let state: Record<ProfilePart, PartStatus> = { history: "waiting", games: "waiting" };
const listeners = new Set<() => void>();

export function setPartStatus(parts: ProfilePart[], status: PartStatus) {
  state = { ...state, ...Object.fromEntries(parts.map((p) => [p, status])) };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER: Record<ProfilePart, PartStatus> = { history: "waiting", games: "waiting" };

export function usePartStatus(part: ProfilePart): PartStatus {
  return useSyncExternalStore(subscribe, () => state[part], () => SERVER[part]);
}
