"use client";

import { GAME_SOURCES } from "@/lib/games";
import type { ColorChoice, GameResult, GameSource } from "@/types";

/**
 * The filter bar over a player's games: colour, result, source, year, and
 * (where the list supports it) the opponent's rating, plus a search box.
 * The games list and the opening tree both use it, so a filter added here
 * appears in both.
 */

export interface GameFilterValues {
  color: ColorChoice | "";
  result: GameResult | "";
  source: GameSource | "";
  year: string;
  /** An opponent-rating band, "<min>-<max>"; either side may be blank. */
  rating: string;
  search: string;
}

export const hasFilters = (f: GameFilterValues) => Object.values(f).some(Boolean);

/**
 * The filters in the page's URL, so a refresh keeps them:
 * ?color=black&result=win&source=chess_results&year=2024&rating=2400-&q=sicilian.
 * Anything not one of the choices offered is dropped.
 */
export function filtersFromParams(params: { get(name: string): string | null }): GameFilterValues {
  const pick = <T extends string>(value: string | null, allowed: readonly T[]): T | "" =>
    allowed.includes(value as T) ? (value as T) : "";
  return {
    color: pick(params.get("color"), ["white", "black"] as const),
    result: pick(params.get("result"), ["win", "draw", "loss"] as const),
    source: pick(params.get("source"), Object.keys(GAME_SOURCES) as GameSource[]),
    year: pick(params.get("year"), YEAR_OPTIONS.map((o) => o.value)),
    rating: pick(params.get("rating"), RATING_OPTIONS.map((o) => o.value)),
    search: params.get("q") ?? "",
  };
}

/** The filters as URL parameters; an unset filter removes its parameter. */
export function filterParams(f: GameFilterValues) {
  return { color: f.color, result: f.result, source: f.source, year: f.year, rating: f.rating, q: f.search };
}

/** The rating band as the games endpoint's min_rating / max_rating. */
export function ratingParams(band: string): { min_rating?: string; max_rating?: string } {
  if (!band) return {};
  const [min, max] = band.split("-");
  return { ...(min ? { min_rating: min } : {}), ...(max ? { max_rating: max } : {}) };
}

const RESULT_OPTIONS: { value: GameResult | ""; label: string }[] = [
  { value: "", label: "All results" },
  { value: "win", label: "Wins" },
  { value: "draw", label: "Draws" },
  { value: "loss", label: "Losses" },
];

const SOURCE_OPTIONS: { value: GameSource | ""; label: string }[] = [
  { value: "", label: "All sources" },
  ...(Object.keys(GAME_SOURCES) as GameSource[]).map((s) => ({ value: s, label: GAME_SOURCES[s].label })),
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: "", label: "All years" },
  ...Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) => {
    const y = String(CURRENT_YEAR - i);
    return { value: y, label: y };
  }),
];

const RATING_OPTIONS = [
  { value: "", label: "All ratings" },
  { value: "-1599", label: "Under 1600" },
  { value: "1600-1799", label: "1600–1799" },
  { value: "1800-1999", label: "1800–1999" },
  { value: "2000-2199", label: "2000–2199" },
  { value: "2200-2399", label: "2200–2399" },
  { value: "2400-", label: "2400+" },
];

const pillCls = (on: boolean) =>
  `rounded-full px-3 py-1 text-xs font-medium transition-colors ${
    on
      ? "bg-brand-600 text-white"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-elevated dark:text-gray-300 dark:hover:bg-dark-muted"
  }`;

const selectCls =
  "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-200 dark:focus:border-brand-500";

const Divider = () => <span className="h-4 w-px bg-gray-200 dark:bg-dark-border" />;

export function GameFilters({
  value,
  onChange,
  showRating = false,
  searchPlaceholder,
  count,
}: {
  value: GameFilterValues;
  onChange: (next: GameFilterValues) => void;
  /** The opponent-rating menu, for lists the backend can filter that way. */
  showRating?: boolean;
  searchPlaceholder: string;
  /** "12 games", at the end of the bar; left out while loading. */
  count?: string;
}) {
  const set = <K extends keyof GameFilterValues>(key: K, v: GameFilterValues[K]) => onChange({ ...value, [key]: v });

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        {(["", "white", "black"] as const).map((c) => (
          <button key={c} type="button" onClick={() => set("color", c)} className={pillCls(value.color === c)}>
            {c === "" ? "All colors" : c === "white" ? "As White" : "As Black"}
          </button>
        ))}
      </div>

      <Divider />

      <div className="flex items-center gap-1.5">
        {RESULT_OPTIONS.map((r) => (
          <button key={r.value} type="button" onClick={() => set("result", r.value)} className={pillCls(value.result === r.value)}>
            {r.label}
          </button>
        ))}
      </div>

      <Divider />

      <select value={value.source} onChange={(e) => set("source", e.target.value as GameSource | "")} className={selectCls} aria-label="Source">
        {SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select value={value.year} onChange={(e) => set("year", e.target.value)} className={selectCls} aria-label="Year">
        {YEAR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {showRating && (
        <select value={value.rating} onChange={(e) => set("rating", e.target.value)} className={selectCls} aria-label="Opponent rating" title="Opponent rating">
          {RATING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      <input
        type="text"
        value={value.search}
        onChange={(e) => set("search", e.target.value)}
        placeholder={searchPlaceholder}
        aria-label="Search"
        className={`${selectCls} min-w-[200px]`}
      />

      {count && <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{count}</span>}
    </div>
  );
}
