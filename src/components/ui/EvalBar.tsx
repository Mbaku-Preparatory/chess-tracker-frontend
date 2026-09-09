"use client";

import { cpToWhitePct, formatScore } from "@/hooks/useStockfish";
import type { StockfishResult } from "@/hooks/useStockfish";

type EvalBarProps = Pick<StockfishResult, "score" | "mate" | "depth" | "isAnalyzing" | "source"> & {
  /**
   * Horizontal is for narrow screens, where the board takes the full width and
   * a column beside it would squeeze the board rather than the bar.
   */
  orientation?: "vertical" | "horizontal";
  className?: string;
};

export function EvalBar({
  score,
  mate,
  depth,
  isAnalyzing,
  source,
  orientation = "vertical",
  className = "",
}: EvalBarProps) {
  const whitePct = cpToWhitePct(score, mate);
  const label    = formatScore(score, mate);

  const status = isAnalyzing ? (
    <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" title="Analysing…" />
  ) : source === "lichess" ? (
    <span className="block h-1.5 w-1.5 rounded-full bg-amber-400" title="Lichess cloud eval" />
  ) : source === "local" ? (
    <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400" title="Local Stockfish" />
  ) : null;

  if (orientation === "horizontal") {
    return (
      <div className={`flex select-none items-center gap-2 ${className}`}>
        {/* White's share grows from the left, which is where White sits when
            the board is the usual way up. */}
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full border border-gray-200 bg-gray-800 dark:border-dark-border dark:bg-gray-900">
          <div
            className="absolute inset-y-0 left-0 bg-white transition-all duration-300 ease-out"
            style={{ width: `${whitePct}%` }}
          />
        </div>
        <span className="min-w-[3rem] text-right font-mono text-[11px] font-bold tabular-nums leading-none text-gray-600 dark:text-gray-400">
          {isAnalyzing && depth === 0 ? "…" : label}
        </span>
        <span className="flex h-2 w-2 items-center justify-center leading-none">{status}</span>
      </div>
    );
  }

  return (
    <div className={`flex w-6 select-none flex-col items-center gap-1 ${className}`}>
      {/* Score label */}
      <span className="text-[10px] font-mono font-bold tabular-nums leading-none text-gray-600 dark:text-gray-400">
        {isAnalyzing && depth === 0 ? "…" : label}
      </span>

      {/* Bar */}
      <div className="relative flex-1 w-3 overflow-hidden rounded-full border border-gray-200 dark:border-dark-border" style={{ minHeight: 120 }}>
        {/* Black portion (top) */}
        <div
          className="absolute inset-x-0 top-0 bg-gray-800 dark:bg-gray-900 transition-all duration-300 ease-out"
          style={{ height: `${100 - whitePct}%` }}
        />
        {/* White portion (bottom) */}
        <div
          className="absolute inset-x-0 bottom-0 bg-white transition-all duration-300 ease-out"
          style={{ height: `${whitePct}%` }}
        />
      </div>

      {/* Source / analyzing indicator */}
      <span className="h-2 w-2 leading-none flex items-center justify-center">{status}</span>
    </div>
  );
}
