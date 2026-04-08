import type { Player } from "@/types";

export const PREP_PRICE_KES = 10;

export function formatKesAmount(amount: number): string {
  return `KES ${amount}`;
}

export function getPrimaryRating(player: Player): number | null {
  return player.standard_rating ?? player.rapid_rating ?? player.blitz_rating ?? null;
}

export function getPrepProductName(player: Player): string {
  const surname = player.full_name.trim().split(/\s+/).at(-1) || player.full_name;
  return `${surname} Prep`;
}
