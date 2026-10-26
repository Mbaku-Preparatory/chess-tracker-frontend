"use server";

import { revalidateTag } from "next/cache";

import { playerTag } from "@/lib/publicPlayer";

/**
 * Drop a profile's cached data once its refresh has finished, so the next
 * render fetches the new history and games instead of waiting out the hour.
 *
 * Callable by anyone, which is fine: the worst it does is make the next view
 * of one profile fetch from the API instead of the cache.
 */
export async function revalidatePlayer(fideId: string): Promise<void> {
  if (!/^\d{1,20}$/.test(fideId)) return;
  revalidateTag(playerTag(fideId));
}
