"use client";

import { useCallback } from "react";

import { PagedGamesTable } from "@/components/games/PagedGamesTable";
import type { GamesSeed } from "@/components/games/usePagedGames";
import { pagedHref, rowFromPublicGame } from "@/lib/games";
import { fetchPublicGames, type PublicGame } from "@/lib/publicPlayer";

/**
 * A public profile's games. The server renders the block holding the page in
 * the URL (so a search engine sees it); the browser fetches the rest, and
 * keeps ?page=&size= in the address bar so a copied link opens the same page.
 */
export function PublicGames({ fideId, basePath, seed }: { fideId: string; basePath: string; seed: GamesSeed<PublicGame> }) {
  const fetchGames = useCallback((offset: number, limit: number) => fetchPublicGames(fideId, offset / limit + 1, limit), [fideId]);

  return (
    <PagedGamesTable
      fetchGames={fetchGames}
      resetKey={fideId}
      seed={seed}
      toRow={(g) => rowFromPublicGame(g, fideId)}
      basePath={basePath}
      onPageChange={(page, size) => window.history.replaceState(null, "", pagedHref(basePath, page, size, "games"))}
    />
  );
}
