import type { FidePlayerToAdd } from "@/lib/addFidePlayer";

/**
 * "Prepare against this player", from a public profile.
 *
 * The button links to /prepare/<fideId>. Signed in, that page adds the player
 * and opens them. Signed out, it keeps the player here and sends the visitor to
 * sign up; whichever way they then sign in (email, Google, Lichess, Chess.com)
 * they land on /home, and ResumePrepare picks the player up from there. One
 * hand-off point instead of threading a "next" through four sign-in flows.
 *
 * The name and federation travel in the URL because the profile already has
 * them and the alternative is a FIDE lookup through the proxy. They only ever
 * name a player in the visitor's own account, so a doctored link can do no more
 * than the search box could.
 */

const PENDING_KEY = "prepare:pending";
// Long enough to sign up and confirm an email; short enough that somebody who
// wandered off is not ambushed by it on a visit weeks later.
const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FIDE_ID = /^\d{1,12}$/;
const MAX_NAME = 200;

export function preparePath(player: FidePlayerToAdd): string {
  const q = new URLSearchParams({ name: player.fullName });
  if (player.federation) q.set("fed", player.federation);
  return `/prepare/${encodeURIComponent(player.fideId)}?${q}`;
}

/** The player a /prepare URL names, or null when it names none. */
export function prepareTarget(fideId: string, search: URLSearchParams): FidePlayerToAdd | null {
  if (!FIDE_ID.test(fideId)) return null;
  const name = (search.get("name") ?? "").trim().slice(0, MAX_NAME);
  const federation = (search.get("fed") ?? "").trim().slice(0, 10) || undefined;
  return { fideId, fullName: name || `FIDE ${fideId}`, federation };
}

type Stored = FidePlayerToAdd & { savedAt: number };

export function savePendingPrepare(player: FidePlayerToAdd): void {
  try {
    const stored: Stored = { ...player, savedAt: Date.now() };
    localStorage.setItem(PENDING_KEY, JSON.stringify(stored));
  } catch {
    // Private mode or storage blocked: they sign up and pick the player by
    // hand, which is where they would have been without this.
  }
}

/** The player a signed-out visitor asked to prepare against, if any, without removing it. */
export function peekPendingPrepare(): FidePlayerToAdd | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Stored>;
    if (typeof s.fideId !== "string" || !FIDE_ID.test(s.fideId)) return null;
    if (typeof s.savedAt !== "number" || Date.now() - s.savedAt > PENDING_MAX_AGE_MS) return null;
    return {
      fideId: s.fideId,
      fullName: typeof s.fullName === "string" && s.fullName ? s.fullName.slice(0, MAX_NAME) : `FIDE ${s.fideId}`,
      federation: typeof s.federation === "string" ? s.federation : undefined,
    };
  } catch {
    return null;
  }
}

/** Read and forget: whatever happens next, it is offered once. */
export function takePendingPrepare(): FidePlayerToAdd | null {
  const player = peekPendingPrepare();
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing to do; it expires on its own.
  }
  return player;
}
