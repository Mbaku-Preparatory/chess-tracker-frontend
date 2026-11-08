import { api } from "@/lib/api";
import { duplicatePlayerFrom, duplicatePlayerHref } from "@/lib/duplicatePlayer";

export type FidePlayerToAdd = { fullName: string; fideId: string; federation?: string };

/**
 * Add a FIDE player to the signed-in account and start pulling their games,
 * then say which page to open. The one way the app does this: the /home search
 * and /prepare (the profile page's "Prepare" button) both come here.
 *
 * No look-before-you-leap check. The server rejects a second row for a FIDE ID
 * you already hold and hands back the one you have, which is both race-proof
 * and, unlike a check built on the players list, able to see your own profile.
 * So a 409 is not a failure: it resolves to that player, with `created: false`.
 * See lib/duplicatePlayer.
 */
export async function addFidePlayer(
  player: FidePlayerToAdd,
  onImportStarted?: () => void
): Promise<{ href: string; created: boolean }> {
  let slug: string;
  try {
    slug = (
      await api.createPlayer({
        full_name: player.fullName,
        fide_id: player.fideId,
        federation: player.federation,
      })
    ).slug;
  } catch (err) {
    const existing = duplicatePlayerFrom(err);
    if (existing) return { href: duplicatePlayerHref(existing), created: false };
    throw err;
  }

  // Start pulling their games immediately, so the profile has something on it
  // by the time it finishes opening.
  try {
    await api.createCareerImportJob(slug, player.fideId);
    onImportStarted?.();
  } catch {
    // The profile exists either way; let them import by hand rather than
    // stranding a half-made player behind an error.
  }
  return { href: `/players/${slug}`, created: true };
}
