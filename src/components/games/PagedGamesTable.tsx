"use client";

import { useEffect, useRef } from "react";

import type { GameRow } from "@/lib/games";

import { GamesTable } from "./GamesTable";
import { Pagination } from "./Pagination";
import { usePagedGames, type FetchGames, type GamesSeed } from "./usePagedGames";

/**
 * A player's games, a page at a time: the table, the pager, and the fetching
 * behind them (usePagedGames). Every games list in the app and on the public
 * site is one of these; each says only how to fetch and how to show a row.
 */
export function PagedGamesTable<T>({
  fetchGames,
  resetKey,
  toRow,
  seed,
  start,
  rowAction,
  basePath,
  onPageChange,
  onCount,
  empty = "No games found.",
  label,
}: {
  fetchGames: FetchGames<T>;
  /** Changes when the list does (new filters): it starts again from page 1. */
  resetKey: string;
  toRow: (item: T) => GameRow;
  seed?: GamesSeed<T>;
  /** The page and size to open on, from the URL. */
  start?: { page: number; pageSize: number };
  /** One more control per row. `remove` takes the game off the list once it is deleted. */
  rowAction?: (row: GameRow, remove: () => void) => React.ReactNode;
  /** Pages are also links (?page=&size=), for a list a search engine should follow. */
  basePath?: string;
  onPageChange?: (page: number, pageSize: number) => void;
  /** The list's total, for a count shown elsewhere. */
  onCount?: (count: number | null) => void;
  empty?: string;
  label?: string;
}) {
  const list = usePagedGames(fetchGames, resetKey, seed, start);
  const top = useRef<HTMLDivElement>(null);

  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;
  useEffect(() => onCountRef.current?.(list.count), [list.count]);

  // Told whenever the page or size changes, whatever changed it (the pager,
  // new filters going back to page 1, a page past the end after a delete),
  // so a URL kept in step stays right. Not on the first render: that is
  // where the URL already is.
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;
  const shown = useRef({ page: list.page, pageSize: list.pageSize });
  useEffect(() => {
    if (shown.current.page === list.page && shown.current.pageSize === list.pageSize) return;
    shown.current = { page: list.page, pageSize: list.pageSize };
    onPageChangeRef.current?.(list.page, list.pageSize);
  }, [list.page, list.pageSize]);

  function go(page: number, pageSize: number) {
    if (pageSize !== list.pageSize) list.setPageSize(pageSize);
    else list.setPage(page);
    // From the pager under a long page, back up to its first game.
    if (top.current && top.current.getBoundingClientRect().top < 0) top.current.scrollIntoView({ block: "start" });
  }

  if (list.error) {
    return (
      <p className="flex flex-wrap items-center gap-3 py-6 text-[14px] text-ink-faint">
        {list.error}
        <button type="button" onClick={list.retry} className="text-accent-soft underline">
          Try again
        </button>
      </p>
    );
  }
  if (list.count === 0) return <p className="py-8 text-center text-[14px] text-ink-faint">{empty}</p>;

  return (
    <div ref={top} className="flex scroll-mt-24 flex-col gap-4">
      {list.rows ? (
        <GamesTable
          rows={list.rows.map(toRow)}
          rowAction={rowAction && ((row) => rowAction(row, () => list.remove((item) => toRow(item).key === row.key)))}
        />
      ) : (
        <div aria-busy className="flex flex-col gap-2">
          {Array.from({ length: Math.min(list.pageSize, 10) }, (_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-ink-raised" />
          ))}
        </div>
      )}
      {list.count !== null && (
        <Pagination count={list.count} page={list.page} pageSize={list.pageSize} basePath={basePath} onChange={go} label={label} />
      )}
    </div>
  );
}
