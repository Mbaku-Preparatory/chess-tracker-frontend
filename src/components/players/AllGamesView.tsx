"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { PagedGamesTable } from "@/components/games/PagedGamesTable";
import { DEFAULT_PAGE_SIZE, pageSizeOf, rowFromGame } from "@/lib/games";
import { intParam, replaceQuery } from "@/lib/urlState";
import { DeleteGameButton } from "./DeleteGameButton";
import { GameFilters, filterParams, filtersFromParams, hasFilters, ratingParams, type GameFilterValues } from "./GameFilters";

interface AllGamesViewProps {
  slug: string;
  /** The scouted player, for their side of each game. */
  playerName: string;
}

export function AllGamesView({ slug, playerName }: AllGamesViewProps) {
  // Filters, page and size live in the URL too, so a refresh keeps them.
  const params = useSearchParams();
  const [filters, setFilters] = useState<GameFilterValues>(() => filtersFromParams(params));
  const [start] = useState(() => ({ page: intParam(params.get("page"), 1), pageSize: pageSizeOf(params.get("size")) }));
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
        onChange={(f) => {
          setFilters(f);
          replaceQuery(filterParams(f));
        }}
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
          start={start}
          onPageChange={(page, size) => replaceQuery({ page: page > 1 ? page : null, size: size !== DEFAULT_PAGE_SIZE ? size : null })}
          onCount={setTotal}
          empty={hasFilters(filters) ? "No games match the current filters." : "No games found."}
        />
      </div>
    </div>
  );
}
