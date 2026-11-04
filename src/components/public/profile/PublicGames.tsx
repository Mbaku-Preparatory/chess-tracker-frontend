"use client";

import { useCallback, useEffect, useState } from "react";

import { PagedGamesTable } from "@/components/games/PagedGamesTable";
import type { GamesSeed } from "@/components/games/usePagedGames";
import { DEFAULT_PAGE_SIZE, pagedHref, pageSizeOf, rowFromPublicGame } from "@/lib/games";
import { fetchPublicGames, type PublicGame } from "@/lib/publicPlayer";

/**
 * A public profile's games. The server renders the first block (so a search
 * engine sees it); the browser fetches the rest, and keeps ?page=&size= in the
 * address bar so a copied link opens the same page.
 *
 * The page is cached whole, the same HTML for every URL, so ?page=&size= is
 * read here, after the first render, and the table moves to it.
 */
export function PublicGames({ fideId, basePath, seed }: { fideId: string; basePath: string; seed: GamesSeed<PublicGame> }) {
  const fetchGames = useCallback((offset: number, limit: number) => fetchPublicGames(fideId, offset / limit + 1, limit), [fideId]);
  const [openAt, setOpenAt] = useState<{ page: number; pageSize: number } | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const asked = Number(query.get("page") ?? 1);
    const page = Number.isInteger(asked) && asked > 0 ? asked : 1;
    const pageSize = pageSizeOf(query.get("size"));
    if (page !== 1 || pageSize !== DEFAULT_PAGE_SIZE) setOpenAt({ page, pageSize });
  }, []);

  return (
    <PagedGamesTable
      fetchGames={fetchGames}
      resetKey={fideId}
      seed={seed}
      openAt={openAt}
      toRow={(g) => rowFromPublicGame(g, fideId)}
      basePath={basePath}
      onPageChange={(page, size) => window.history.replaceState(null, "", pagedHref(basePath, page, size, "games"))}
    />
  );
}
