"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { PagedGamesTable } from "@/components/games/PagedGamesTable";
import { rowFromGame } from "@/lib/games";
import { DeleteGameButton } from "./DeleteGameButton";
import { GameFilters, NO_FILTERS, hasFilters, ratingParams, type GameFilterValues } from "./GameFilters";

interface AllGamesViewProps {
  slug: string;
  /** The scouted player, for their side of each game. */
  playerName: string;
}

export function AllGamesView({ slug, playerName }: AllGamesViewProps) {
  const [filters, setFilters] = useState<GameFilterValues>(NO_FILTERS);
  const [total, setTotal] = useState<number | null>(null);

  const fetchGames = useCallback(
    (offset: number, limit: number) => {
      const { color, result, source, year, rating, search } = filters;
      return api.getPlayerGames(slug, {
        ...(color ? { color_played: color } : {}),
        ...(result ? { result } : {}),
        ...(source ? { source } : {}),
        ...(year ? { year } : {}),
        ...ratingParams(rating),
        ...(search ? { search } : {}),
        // offset is a multiple of limit: the page of that size it starts.
        page: offset / limit + 1,
        page_size: limit,
      });
    },
    [slug, filters],
  );

  return (
    <div>
      <GameFilters
        value={filters}
        onChange={setFilters}
        showRating
        searchPlaceholder="Search opponent, event, opening…"
        count={total === null ? undefined : `${total} game${total !== 1 ? "s" : ""}`}
      />

      <div className="rounded-xl bg-ink-card p-4 sm:p-6">
        <PagedGamesTable
          fetchGames={fetchGames}
          resetKey={`${slug}|${JSON.stringify(filters)}`}
          toRow={(g) => rowFromGame(g, playerName)}
          rowAction={(row, remove) => <DeleteGameButton gameRef={row.key} onDeleted={remove} />}
          onCount={setTotal}
          empty={hasFilters(filters) ? "No games match the current filters." : "No games found."}
        />
      </div>
    </div>
  );
}
