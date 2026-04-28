"use client";

import { cpToWhitePct, formatScore } from "@/hooks/useStockfish";

interface EvalBarProps {
  score: number | null;
  mate: number | null;
  depth: number;
  isAnalyzing: boolean;
}

export function EvalBar({ score, mate, depth, isAnalyzing }: EvalBarProps) {
  const whitePct = cpToWhitePct(score, mate);
  const label    = formatScore(score, mate);
  const isWhiteAhead = mate !== null ? mate > 0 : (score ?? 0) >= 0;

  return (
    <div className="flex w-6 flex-col items-center gap-1 select-none">
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

      {/* Depth indicator */}
      <span className="text-[9px] font-mono text-gray-400 dark:text-gray-600 leading-none">
        {isAnalyzing ? `d${depth}` : depth > 0 ? `d${depth}` : ""}
      </span>
    </div>
  );
}
