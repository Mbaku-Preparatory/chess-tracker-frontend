/**
 * Turning FIDE rating history into chart series and the figures on the rating
 * cards. Pure functions: the cards render on the server, the history chart in
 * the browser, and both must agree.
 */

import type { RatingPoint } from "./publicPlayer";

export type TimeControl = "standard" | "rapid" | "blitz";

export const TIME_CONTROLS: { key: TimeControl; label: string }[] = [
  { key: "standard", label: "Classical" },
  { key: "rapid", label: "Rapid" },
  { key: "blitz", label: "Blitz" },
];

export type SeriesPoint = { month: Date; rating: number; games: number };

const RATING: Record<TimeControl, "standardRating" | "rapidRating" | "blitzRating"> = {
  standard: "standardRating",
  rapid: "rapidRating",
  blitz: "blitzRating",
};
const GAMES: Record<TimeControl, "standardGames" | "rapidGames" | "blitzGames"> = {
  standard: "standardGames",
  rapid: "rapidGames",
  blitz: "blitzGames",
};

/** One time control's rated months, oldest first. Months unrated in it are
 * left out rather than drawn as zero. */
export function series(history: RatingPoint[], tc: TimeControl): SeriesPoint[] {
  return history
    .filter((p) => p[RATING[tc]] != null)
    .map((p) => ({
      month: new Date(`${p.month}T00:00:00Z`),
      rating: p[RATING[tc]] as number,
      games: p[GAMES[tc]] ?? 0,
    }));
}

function monthsBefore(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1));
}

/** The last `months` of a series, measured back from its own latest point
 * rather than from today, so an inactive player's chart is not empty. */
export function lastMonths(points: SeriesPoint[], months: number): SeriesPoint[] {
  if (!points.length) return points;
  const from = monthsBefore(points[points.length - 1].month, months);
  return points.filter((p) => p.month > from);
}

/** Rating change and rated games over the last twelve months of the series.
 * The change is against the last list at least a year old; null when the
 * series does not reach back that far. */
export function lastYear(points: SeriesPoint[]): { change: number | null; games: number } {
  if (!points.length) return { change: null, games: 0 };
  const latest = points[points.length - 1];
  const yearAgo = monthsBefore(latest.month, 12);
  const before = [...points].reverse().find((p) => p.month <= yearAgo);
  const games = points.filter((p) => p.month > yearAgo).reduce((sum, p) => sum + p.games, 0);
  return { change: before ? latest.rating - before.rating : null, games };
}

export type Scale = {
  min: number;
  max: number;
  ticks: number[];
  x: (date: Date) => number;
  y: (rating: number) => number;
};

/** Linear scales for a series in a width × height box. The rating axis is
 * padded to round numbers and ticked every 50, 100 or 200 points, whichever
 * gives four to six lines. */
export function scale(points: SeriesPoint[], width: number, height: number): Scale {
  const ratings = points.map((p) => p.rating);
  const lo = Math.min(...ratings);
  const hi = Math.max(...ratings);
  const step = [50, 100, 200, 400].find((s) => (hi - lo) / s <= 5) ?? 400;
  const min = Math.floor(lo / step) * step - (lo % step === 0 ? step : 0);
  const max = Math.ceil(hi / step) * step + (hi % step === 0 ? step : 0);
  const ticks: number[] = [];
  for (let t = min; t <= max; t += step) ticks.push(t);

  const t0 = points[0].month.getTime();
  const t1 = points[points.length - 1].month.getTime();
  const span = Math.max(t1 - t0, 1);
  return {
    min,
    max,
    ticks,
    x: (date) => (points.length === 1 ? width / 2 : ((date.getTime() - t0) / span) * width),
    y: (rating) => height - ((rating - min) / (max - min)) * height,
  };
}

/** An SVG path through the points: a line, and the same line closed down to
 * the baseline for the area fill. */
export function paths(points: SeriesPoint[], s: Scale, height: number): { line: string; area: string } {
  const coords = points.map((p) => `${s.x(p.month).toFixed(1)},${s.y(p.rating).toFixed(1)}`);
  const line = `M${coords.join("L")}`;
  const first = s.x(points[0].month).toFixed(1);
  const last = s.x(points[points.length - 1].month).toFixed(1);
  return { line, area: `${line}L${last},${height}L${first},${height}Z` };
}

export function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}
