import { Country } from "@/components/Country";
import { T } from "@/components/T";
import { lastMonths, lastYear, paths, scale, type SeriesPoint } from "@/lib/ratingSeries";

const W = 120;
const H = 36;

function Sparkline({ points }: { points: SeriesPoint[] }) {
  const recent = lastMonths(points, 12);
  if (recent.length < 2) return null;
  const s = scale(recent, W, H);
  const { line } = paths(recent, s, H);
  return (
    <svg width={W} height={H} viewBox={`-2 -2 ${W + 4} ${H + 4}`} aria-hidden="true" className="shrink-0">
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" />
    </svg>
  );
}

function signed(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

/** One time control: the rating, its ranks, and the last twelve months.
 * `label` is English marked with msg(), shown translated. */
export function RatingCard({
  label,
  rating,
  worldRank,
  nationalRank,
  federation,
  points,
}: {
  label: string;
  rating: number | null;
  worldRank: number | null;
  nationalRank: number | null;
  federation: string;
  points: SeriesPoint[];
}) {
  const year = lastYear(points);
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-ink-card p-6" aria-labelledby={`rating-${label}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`rating-${label}`} className="text-[12px] font-[520] uppercase tracking-[0.08em] text-ink-muted">
          <T>{label}</T>
        </h3>
        {worldRank != null && (
          <span className="text-[12px] tabular-nums text-ink-faint">
            <T vars={{ rank: worldRank.toLocaleString("en") }}>{"World #{rank}"}</T>
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-4">
        {rating != null ? (
          <p className="text-[40px] font-[480] leading-none tracking-[0.01em] tabular-nums">{rating}</p>
        ) : (
          <p className="text-[24px] font-[420] leading-none text-ink-faint">
            <T>Unrated</T>
          </p>
        )}
        <span className={year.change != null && year.change < 0 ? "text-result-loss" : "text-accent"}>
          <Sparkline points={points} />
        </span>
      </div>

      <p className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-faint">
        {year.change != null && (
          <span className={`tabular-nums ${year.change < 0 ? "text-result-loss" : "text-accent-soft"}`}>
            <T vars={{ change: signed(year.change) }}>{"{change} in 12 months"}</T>
          </span>
        )}
        {/* Only from history: before it is fetched, "0 games" would read as a fact. */}
        {rating != null && points.length > 0 && (
          <span className="tabular-nums">
            <T n={year.games} one="{n} rated game in 12 months">{"{n} rated games in 12 months"}</T>
          </span>
        )}
        {nationalRank != null && (
          <span className="tabular-nums">
            <T vars={{ rank: nationalRank.toLocaleString("en"), country: <Country code={federation} /> }}>{"#{rank} in {country}"}</T>
          </span>
        )}
      </p>
    </section>
  );
}
