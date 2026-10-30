/**
 * Keeping a page's view in its URL (tab, filters, page), so a refresh or a
 * copied link opens it where it was.
 */

/** null (or "") drops the parameter, which is how defaults are left out;
 * undefined leaves it as it is. */
export type QueryUpdate = Record<string, string | number | null | undefined>;

/**
 * Rewrites the address bar's query without navigating: no new history entry,
 * no refetch. Next keeps useSearchParams in step with it.
 */
export function replaceQuery(update: QueryUpdate) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(update)) {
    if (value === undefined) continue;
    if (value === null || value === "") params.delete(key);
    else params.set(key, String(value));
  }
  const qs = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
}

/** A positive whole number from the URL, or the fallback. */
export function intParam(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
