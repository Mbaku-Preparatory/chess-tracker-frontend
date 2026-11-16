import { msg, type Vars } from "@/lib/i18n";
import type { Player } from "@/types";

export function getPrimaryRating(player: Player): number | null {
  return player.standard_rating ?? player.rapid_rating ?? player.blitz_rating ?? null;
}

/** "Carlsen Prep". `t` translates (useT()). */
export function getPrepProductName(player: Player, t: (text: string, vars?: Vars) => string): string {
  const surname = player.full_name.trim().split(/\s+/).at(-1) || player.full_name;
  return t(msg("{name} Prep"), { name: surname });
}
