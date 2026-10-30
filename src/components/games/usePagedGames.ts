"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_PAGE_SIZE, fetchSize } from "@/lib/games";

export interface GamesChunk<T> {
  count: number;
  results: T[];
}

/**
 * Fetches `limit` games from `offset`. `offset` is always a multiple of
 * `limit`, so a server that pages by number serves it as page
 * offset / limit + 1 of size limit.
 */
export type FetchGames<T> = (offset: number, limit: number) => Promise<GamesChunk<T>>;

/** Games fetched before the first render (the public profile's, on the server). */
export interface GamesSeed<T> extends GamesChunk<T> {
  offset: number;
  page: number;
  pageSize: number;
}

interface Store<T> {
  /** Which list these games belong to; a new key (new filters) starts over. */
  key: string;
  /** Games by their position in the whole list; holes are not fetched yet. */
  items: (T | undefined)[];
  count: number | null;
}

function place<T>(items: (T | undefined)[], offset: number, results: T[]): (T | undefined)[] {
  const next = items.slice();
  results.forEach((r, i) => (next[offset + i] = r));
  return next;
}

/**
 * A games list shown a page at a time but fetched in bigger blocks (see
 * fetchSize): 10 a page by default, fetched 50 at a time, so the first five
 * pages cost one request.
 *
 * - The page shown is fetched if any of it is missing: the first visit, or a
 *   jump straight to the last page.
 * - Two pages before the end of what is fetched (page 4 of 5), the next block
 *   is fetched, so page 6 is there when it is asked for. The same going back
 *   from the end.
 * - Fetched games are kept by position, so changing the page size reuses
 *   them, and deleting one closes the gap the way the server will.
 */
export function usePagedGames<T>(
  fetchGames: FetchGames<T>,
  resetKey: string,
  seed?: GamesSeed<T>,
  /** Where to open when nothing is seeded: the page and size in the URL. */
  initial?: { page: number; pageSize: number },
) {
  const [store, setStore] = useState<Store<T>>(() => ({
    key: resetKey,
    items: seed ? place([], seed.offset, seed.results) : [],
    count: seed ? seed.count : null,
  }));
  const [page, setPage] = useState(seed?.page ?? initial?.page ?? 1);
  const [pageSize, setPageSizeState] = useState(seed?.pageSize ?? initial?.pageSize ?? DEFAULT_PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // New filters are a new list: start again from the first page. Done while
  // rendering, so no render shows the old games under the new filters.
  if (store.key !== resetKey) {
    setStore({ key: resetKey, items: [], count: null });
    setPage(1);
    setError(null);
  }

  const fetchRef = useRef(fetchGames);
  fetchRef.current = fetchGames;
  const inflight = useRef(new Set<string>());

  const load = useCallback(
    (offset: number, limit: number) => {
      const key = `${resetKey}|${offset}:${limit}`;
      if (inflight.current.has(key)) return;
      inflight.current.add(key);
      fetchRef
        .current(offset, limit)
        .then(({ count, results }) =>
          setStore((s) => (s.key === resetKey ? { key: s.key, count, items: place(s.items, offset, results) } : s)),
        )
        .catch(() => setError("These games could not be loaded."))
        .finally(() => inflight.current.delete(key));
    },
    [resetKey],
  );

  const { items, count } = store.key === resetKey ? store : { items: [], count: null };
  const chunk = fetchSize(pageSize);

  useEffect(() => {
    if (store.key !== resetKey || error) return;
    const blockOf = (p: number) => Math.floor(((p - 1) * pageSize) / chunk) * chunk;
    const missing = (p: number) => {
      const start = (p - 1) * pageSize;
      if (p < 1 || (count !== null && start >= count)) return false;
      const end = count === null ? start + pageSize : Math.min(start + pageSize, count);
      for (let i = start; i < end; i++) if (items[i] === undefined) return true;
      return false;
    };
    if (missing(page)) load(blockOf(page), chunk);
    // Ahead of the reader, once we know how far the list goes.
    if (count !== null) for (const p of [page + 2, page - 2]) if (missing(p)) load(blockOf(p), chunk);
  }, [store.key, resetKey, items, count, page, pageSize, chunk, error, attempt, load]);

  // A page past the end (the last game on it deleted): back to the last page.
  const pages = count === null ? 1 : Math.max(1, Math.ceil(count / pageSize));
  useEffect(() => {
    if (count !== null && page > pages) setPage(pages);
  }, [count, page, pages]);

  const start = (page - 1) * pageSize;
  const slice = count === null ? null : items.slice(start, Math.min(start + pageSize, count));
  const rows = slice && slice.every((r) => r !== undefined) && slice.length === Math.max(0, Math.min(pageSize, count! - start)) ? (slice as T[]) : null;

  /** A new page size, keeping the first game on screen on screen. */
  function setPageSize(size: number) {
    setPageSizeState(size);
    setPage(Math.floor(start / size) + 1);
  }

  /** Drops a game the user deleted, as the server has. */
  function remove(match: (item: T) => boolean) {
    setStore((s) => {
      const i = s.items.findIndex((it) => it !== undefined && match(it));
      if (i < 0) return s;
      const next = s.items.slice();
      next.splice(i, 1);
      return { ...s, items: next, count: s.count === null ? null : s.count - 1 };
    });
  }

  function retry() {
    setError(null);
    setAttempt((a) => a + 1);
  }

  return { rows, count, page, pageSize, setPage, setPageSize, remove, error, retry };
}
