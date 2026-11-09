import Link from "next/link";

import { GamesTable } from "@/components/games/GamesTable";
import { PUBLIC_GAMES_SHOWN } from "@/lib/freeLimits";
import { rowFromPublicGame } from "@/lib/games";
import { preparePath } from "@/lib/prepare";
import type { PublicGame } from "@/lib/publicPlayer";

/**
 * A public profile's most recent PUBLIC_GAMES_SHOWN games, in the server's
 * HTML. The rest are for an account: "See all" goes where "Prepare against"
 * goes (lib/prepare.ts), which signs a visitor up and then opens this player
 * in the app with every game; someone signed in goes straight there.
 */
export function PublicGames({
  player,
  games,
  count,
}: {
  player: { fideId: string; fullName: string; federation?: string };
  games: PublicGame[];
  count: number;
}) {
  const more = count - games.length;
  return (
    <div className="flex flex-col gap-4">
      <GamesTable rows={games.slice(0, PUBLIC_GAMES_SHOWN).map((g) => rowFromPublicGame(g, player.fideId))} />
      {more > 0 && (
        <div className="flex flex-col items-start gap-3 rounded-lg bg-ink-raised p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] text-ink-muted">
            {more.toLocaleString("en")} more {more === 1 ? "game" : "games"}, with their openings, in your account.
          </p>
          <Link
            href={preparePath(player)}
            className="whitespace-nowrap rounded-pill bg-accent px-5 py-2.5 text-[15px] font-[480] text-accent-on hover:bg-accent-soft"
          >
            See all {count.toLocaleString("en")} games
          </Link>
        </div>
      )}
    </div>
  );
}
