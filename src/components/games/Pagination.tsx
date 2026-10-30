"use client";

import { PAGE_SIZES, pagedHref } from "@/lib/games";

/** The pages to show as numbers: the ends, and two either side of this one. */
function pageWindow(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const left = Math.max(2, page - 2);
  const right = Math.min(pages - 1, page + 2);
  if (left > 2) out.push("…");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < pages - 1) out.push("…");
  out.push(pages);
  return out;
}

const item = "inline-flex min-w-9 items-center justify-center rounded-pill px-3 py-1.5 tabular-nums";
const idle = `${item} text-ink-muted hover:bg-ink-raised hover:text-ink-text`;
const current = `${item} bg-ink-raised font-[520] text-ink-text`;
const off = `${item} text-ink-faint opacity-50`;

/**
 * Pages of a games list, and how many to a page.
 *
 * With `basePath` the pages are real links (?page=&size=), so a search engine
 * can follow them, but a click is still handled here, without loading the
 * page again. Changing the size keeps the first game on screen in view.
 */
export function Pagination({
  count,
  page,
  pageSize,
  basePath,
  onChange,
  label = "Games pages",
}: {
  count: number;
  page: number;
  pageSize: number;
  basePath?: string;
  onChange: (page: number, pageSize: number) => void;
  label?: string;
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (count === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(count, page * pageSize);

  function to(p: number, children: React.ReactNode, className: string, extra?: { rel?: string; "aria-label"?: string; "aria-current"?: "page" }) {
    if (basePath !== undefined) {
      return (
        <a
          href={pagedHref(basePath, p, pageSize)}
          onClick={(e) => {
            // A new tab or window still gets the link.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            onChange(p, pageSize);
          }}
          className={className}
          {...extra}
        >
          {children}
        </a>
      );
    }
    return (
      <button type="button" onClick={() => onChange(p, pageSize)} className={className} {...extra}>
        {children}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 text-[13px]">
      <p className="tabular-nums text-ink-faint">
        Showing {first.toLocaleString("en")}–{last.toLocaleString("en")} of {count.toLocaleString("en")}
      </p>

      {pages > 1 && (
        <nav aria-label={label} className="flex items-center gap-1">
          {page > 1 ? to(page - 1, "Previous", idle, { rel: "prev" }) : <span className={off}>Previous</span>}
          {/* Numbers from a tablet up; a phone has room for "3 of 32". */}
          <span className="hidden items-center gap-1 sm:flex">
            {pageWindow(page, pages).map((p, i) =>
              p === "…" ? (
                <span key={`gap-${i}`} className="px-1 text-ink-faint">
                  …
                </span>
              ) : (
                <span key={p}>{to(p, p, p === page ? current : idle, { "aria-label": `Page ${p}`, ...(p === page && { "aria-current": "page" as const }) })}</span>
              ),
            )}
          </span>
          <span className="px-2 tabular-nums text-ink-faint sm:hidden">
            {page} of {pages}
          </span>
          {page < pages ? to(page + 1, "Next", idle, { rel: "next" }) : <span className={off}>Next</span>}
        </nav>
      )}

      {count > PAGE_SIZES[0] && (
        <label className="flex items-center gap-2 text-ink-faint">
          Per page
          <select
            value={pageSize}
            onChange={(e) => onChange(page, Number(e.target.value))}
            className="rounded-lg border border-ink-line bg-ink-card px-2 py-1 text-[13px] text-ink-text"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
