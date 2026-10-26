"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { RatingPoint } from "@/lib/publicPlayer";
import {
  TIME_CONTROLS,
  formatMonth,
  lastMonths,
  paths,
  scale,
  series,
  type TimeControl,
} from "@/lib/ratingSeries";

const RANGES = [
  { key: "1Y", months: 12 },
  { key: "3Y", months: 36 },
  { key: "5Y", months: 60 },
  { key: "All", months: Infinity },
] as const;

// The SVG is drawn at the width it is shown at, not scaled from a fixed
// viewBox: scaled down to a phone, 11px axis labels would render at 6px.
// DEFAULT_W is the server render's guess, replaced once the browser measures.
const DEFAULT_W = 680;
const M = { top: 12, right: 12, bottom: 28, left: 44 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(DEFAULT_W);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-pill bg-ink-raised p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          disabled={o.disabled}
          aria-pressed={o.key === value}
          onClick={() => onChange(o.key)}
          className={`rounded-pill px-3 py-1 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 ${
            o.key === value ? "bg-ink-canvas text-ink-text" : "text-ink-muted hover:text-ink-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Official monthly FIDE ratings, one time control at a time. */
export function RatingHistoryChart({ history }: { history: RatingPoint[] }) {
  const available = TIME_CONTROLS.filter((tc) => series(history, tc.key).length > 0);
  const [tc, setTc] = useState<TimeControl>(available[0]?.key ?? "standard");
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("All");
  const [hover, setHover] = useState<number | null>(null);
  const [frame, W] = useWidth<HTMLDivElement>();
  const H = W < 480 ? 200 : 240;

  const points = useMemo(() => {
    const all = series(history, tc);
    const months = RANGES.find((r) => r.key === range)!.months;
    return Number.isFinite(months) ? lastMonths(all, months) : all;
  }, [history, tc, range]);

  if (!available.length) {
    return <p className="py-16 text-center text-[14px] text-ink-faint">No rating history yet.</p>;
  }

  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const s = points.length ? scale(points, innerW, innerH) : null;
  const drawn = s ? paths(points, s, innerH) : null;
  const latest = points[points.length - 1];
  const hovered = hover != null ? points[hover] : null;

  // One label per year, thinned so they never collide.
  const years = s
    ? Array.from(new Set(points.map((p) => p.month.getUTCFullYear()))).map(
        (y) => new Date(Date.UTC(y, 0, 1)),
      )
    : [];
  const everyNth = Math.ceil(years.length / Math.max(2, Math.floor(innerW / 80)));

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    if (!s || !points.length) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * innerW;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(s.x(p.month) - x) < Math.abs(s.x(points[best].month) - x)) best = i;
    });
    setHover(best);
  }

  return (
    <div ref={frame} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Time control"
          value={tc}
          onChange={(v) => {
            setTc(v);
            setHover(null);
          }}
          options={TIME_CONTROLS.map((t) => ({ ...t, disabled: !available.some((a) => a.key === t.key) }))}
        />
        <Segmented
          label="Range"
          value={range}
          onChange={(v) => {
            setRange(v);
            setHover(null);
          }}
          options={RANGES.map((r) => ({ key: r.key, label: r.key }))}
        />
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[28px] font-[480] tabular-nums leading-none">
          {(hovered ?? latest)?.rating ?? "—"}
        </p>
        <p className="text-[13px] text-ink-faint">
          {hovered ? formatMonth(hovered.month) : latest ? `Latest list, ${formatMonth(latest.month)}` : ""}
        </p>
      </div>

      {s && drawn && (
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="max-w-full touch-none select-none"
          role="img"
          aria-label={`${TIME_CONTROLS.find((t) => t.key === tc)!.label} rating from ${formatMonth(points[0].month)} to ${formatMonth(latest.month)}: ${points[0].rating} to ${latest.rating}`}
        >
          <defs>
            <linearGradient id="rating-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: "rgb(var(--accent))" }} stopOpacity="0.28" />
              <stop offset="100%" style={{ stopColor: "rgb(var(--accent))" }} stopOpacity="0" />
            </linearGradient>
          </defs>
          <g transform={`translate(${M.left},${M.top})`}>
            {s.ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={innerW} y1={s.y(t)} y2={s.y(t)} className="stroke-ink-line" strokeWidth={1} />
                <text x={-8} y={s.y(t)} dy="0.32em" textAnchor="end" fontSize={11} className="fill-ink-faint">
                  {t}
                </text>
              </g>
            ))}
            {years.map((y, i) =>
              i % everyNth === 0 && s.x(y) >= 0 ? (
                <text key={y.getTime()} x={s.x(y)} y={innerH + 20} textAnchor="middle" fontSize={11} className="fill-ink-faint">
                  {y.getUTCFullYear()}
                </text>
              ) : null,
            )}
            <path d={drawn.area} fill="url(#rating-fill)" />
            <path d={drawn.line} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" />
            <circle cx={s.x(latest.month)} cy={s.y(latest.rating)} r={3.5} className="fill-accent" />
            {hovered && (
              <g>
                <line
                  x1={s.x(hovered.month)}
                  x2={s.x(hovered.month)}
                  y1={0}
                  y2={innerH}
                  className="stroke-ink-muted"
                  strokeOpacity={0.4}
                />
                <circle cx={s.x(hovered.month)} cy={s.y(hovered.rating)} r={4.5} className="fill-ink-text" />
              </g>
            )}
            <rect
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </g>
        </svg>
      )}
    </div>
  );
}
