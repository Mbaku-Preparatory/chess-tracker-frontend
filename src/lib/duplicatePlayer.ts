/**
 * The one answer the API gives when you already have somebody.
 *
 * The server owns duplicate detection now — a POST that would create a second
 * row for a FIDE ID you already hold comes back 409 with the row you already
 * have, rather than creating it. That replaced a check the client did for
 * itself, which had two holes no amount of client code could close:
 *
 *  - it ran against the players list, which excludes your own profile, so it
 *    was blind to your own FIDE ID and made a second copy of you every time;
 *  - check-then-create is a race, and the add button is easy to double-click.
 *
 * So `add()` no longer looks before it leaps. It posts, and treats 409 as the
 * successful outcome it is: the player exists, here is where they live.
 */

import type { AppError } from "@/lib/apiError";

export interface DuplicatePlayer {
  id: number;
  public_id: string;
  slug: string;
  full_name: string;
  fide_id: string | null;
  /** Your own profile lives at /me — never at /players/<slug>. */
  is_self: boolean;
}

interface DuplicateBody {
  code?: unknown;
  player?: unknown;
}

/** The existing player a 409 points at, or null if this is a different error. */
export function duplicatePlayerFrom(err: unknown): DuplicatePlayer | null {
  const app = err as AppError | undefined;
  if (!app || app.status !== 409) return null;

  const body = app.body as DuplicateBody | undefined;
  if (!body || body.code !== "duplicate_fide_id") return null;

  const player = body.player as Partial<DuplicatePlayer> | undefined;
  if (!player || typeof player.slug !== "string") return null;

  return {
    id: Number(player.id),
    public_id: String(player.public_id ?? ""),
    slug: player.slug,
    full_name: String(player.full_name ?? ""),
    fide_id: player.fide_id ?? null,
    // Checked as a real boolean rather than for truthiness: DRF used to coerce
    // this to the string "False", which is truthy here and would have sent
    // every caller to /me. The server no longer does that; this is the belt.
    is_self: player.is_self === true,
  };
}

/** Where to send somebody to see the player they already have. */
export function duplicatePlayerHref(player: DuplicatePlayer): string {
  return player.is_self ? "/me" : `/players/${player.slug}`;
}
