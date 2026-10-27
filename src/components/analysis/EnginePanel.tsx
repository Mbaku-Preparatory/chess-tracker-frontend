"use client";

import { DEPTHS, type AnalysisPrefs, type EngineDepth } from "@/lib/analysisPrefs";
import { MULTI_PV, formatScore, pvToSan, type EngineResult } from "@/hooks/useEngine";

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-[14px] font-[520] text-ink-text"
    >
      <span className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-accent" : "bg-ink-line"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

/** The engine switch, its depth, and the best lines it has found. */
export function EnginePanel({
  prefs,
  setPrefs,
  engine,
  fen,
}: {
  prefs: AnalysisPrefs;
  setPrefs: (change: Partial<AnalysisPrefs>) => void;
  engine: EngineResult;
  fen: string;
}) {
  const status = engine.isAnalyzing
    ? engine.depth > 0 ? `Analysing · depth ${engine.depth}` : "Analysing…"
    : engine.source === "lichess"
      ? `Depth ${engine.depth} · Lichess cloud`
      : engine.source === "local"
        ? `Depth ${engine.depth} · Stockfish on this device`
        : null;

  return (
    <section aria-label="Engine" className="flex flex-col gap-3 rounded-xl bg-ink-card p-4">
      <Switch checked={prefs.engine} onChange={(engineOn) => setPrefs({ engine: engineOn })} label="Engine" />

      {prefs.engine ? (
        <>
          <div role="radiogroup" aria-label="Engine depth" className="flex gap-1 rounded-lg bg-ink-raised p-0.5">
            {(Object.keys(DEPTHS) as EngineDepth[]).map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={prefs.depth === key}
                onClick={() => setPrefs({ depth: key })}
                className={`flex-1 rounded-md px-2 py-1 text-[13px] transition-colors ${
                  prefs.depth === key ? "bg-ink-card font-[520] text-ink-text shadow-sm" : "text-ink-muted hover:text-ink-text"
                }`}
              >
                {DEPTHS[key].label} <span className="text-ink-faint">{DEPTHS[key].depth}</span>
              </button>
            ))}
          </div>

          {/* Everything below keeps one height whatever the engine is doing. The
              lines empty while a new position is analysed and fill again when it
              answers; a panel that shrank and grew with them shoved the move list
              and the very buttons being clicked up and down on every move. */}
          <p className="h-4 text-[12px] leading-4 text-ink-faint">{status ?? "\u00a0"}</p>

          <ol className="flex flex-col gap-1.5">
            {Array.from({ length: MULTI_PV }, (_, i) => {
              const line = engine.lines[i];
              const empty = !engine.isAnalyzing && engine.lines.length === 0;
              return (
                <li key={i} className="flex h-6 min-w-0 items-center gap-2 text-[13px]">
                  {line ? (
                    <>
                      <span
                        className={`w-14 shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[12px] font-bold tabular-nums ${
                          (line.mate ?? line.score ?? 0) >= 0 ? "bg-white text-neutral-900 ring-1 ring-ink-line" : "bg-neutral-800 text-white"
                        }`}
                      >
                        {formatScore(line.score, line.mate)}
                      </span>
                      <span className="min-w-0 truncate font-mono text-ink-muted">{pvToSan(fen, line.pv)}</span>
                    </>
                  ) : empty && i === 0 ? (
                    <span className="text-ink-faint">No evaluation for this position.</span>
                  ) : (
                    <span className={`h-5 w-14 shrink-0 rounded bg-ink-raised ${engine.isAnalyzing ? "animate-pulse" : "opacity-0"}`} />
                  )}
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <p className="text-[13px] leading-[1.5] text-ink-faint">
          Off. Turn it on for the evaluation and the best lines. It runs on this device, and Lichess&apos;s
          cloud answers first for positions it already knows.
        </p>
      )}
    </section>
  );
}
