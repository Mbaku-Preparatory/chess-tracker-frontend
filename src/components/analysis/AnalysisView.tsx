"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { hasInAppHistory } from "@/components/NavigationMemory";
import { EvalBar } from "@/components/ui/EvalBar";
import { DEPTHS, useAnalysisPrefs } from "@/lib/analysisPrefs";
import { api } from "@/lib/api";
import { movetext, parsePgn } from "@/lib/chess/pgn";
import { useAnalysisLine } from "@/lib/chess/useAnalysisLine";
import { playSound, soundFor } from "@/lib/chessSounds";
import { useEngine } from "@/hooks/useEngine";

import { EnginePanel } from "./EnginePanel";
import { ShareSheet } from "./ShareSheet";

const Board = dynamic(() => import("./Board"), {
  ssr: false,
  loading: () => <div className="aspect-square w-full animate-pulse rounded-lg bg-ink-raised" />,
});

export interface AnalysisSide {
  name: string;
  rating: number | string | null;
  /** "1", "0" or "½": this side's result. */
  score: string | null;
  /** Their profile, when they have one. */
  href?: string | null;
}

export interface AnalysisViewProps {
  pgn: string;
  white: AnalysisSide;
  black: AnalysisSide;
  orientation?: "white" | "black";
  /** "1-0", "0-1", "1/2-1/2", or "*" when unknown. */
  result: string;
  title: string;
  details: (string | number | null | undefined | false)[];
  filename: string;
  /** The page's public address, for sharing. Null for a signed-in-only page. */
  shareUrl: string | null;
  /** Signed in: send the PGN through our Lichess import. Otherwise open
   * Lichess's analysis board with the moves in the URL. */
  importToLichess: boolean;
  back: { href: string; label: string };
}

function BackButton({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      // Opened from inside the site: back is exactly the browser's back, so
      // the list comes back where it was. Landed on directly: go where the
      // button says, rather than off the site.
      onClick={(e) => {
        if (hasInAppHistory()) {
          e.preventDefault();
          router.back();
        }
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-ink-card px-3 py-2 text-[14px] text-ink-muted hover:bg-ink-raised hover:text-ink-text"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  );
}

function Plate({ side, color }: { side: AnalysisSide; color: "white" | "black" }) {
  return (
    <div className="flex min-w-0 items-center gap-2 px-0.5 text-[14px]">
      <span
        aria-hidden
        className={`h-3 w-3 shrink-0 rounded-full border ${color === "white" ? "border-neutral-300 bg-white" : "border-neutral-600 bg-neutral-900"}`}
      />
      {side.href ? (
        <Link href={side.href} className="min-w-0 truncate font-[520] text-ink-text hover:text-accent-soft">{side.name}</Link>
      ) : (
        <span className="min-w-0 truncate font-[520] text-ink-text">{side.name}</span>
      )}
      {side.score && <span className="shrink-0 font-bold tabular-nums text-ink-text">({side.score})</span>}
      {side.rating && <span className="ml-auto shrink-0 text-[13px] tabular-nums text-ink-faint">{side.rating}</span>}
    </div>
  );
}

const ICONS = {
  start: "M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z",
  prev: "M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z",
  next: "M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z",
  end: "M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z",
};

function Nav({ index, last, goTo, className = "" }: { index: number; last: number; goTo: (i: number) => void; className?: string }) {
  const buttons: [keyof typeof ICONS, string, number, boolean][] = [
    ["start", "Start", -1, index === -1],
    ["prev", "Previous move", index - 1, index === -1],
    ["next", "Next move", index + 1, index === last],
    ["end", "Last move", last, index === last],
  ];
  return (
    <div className={`grid grid-cols-4 gap-2 ${className}`}>
      {buttons.map(([icon, label, target, disabled]) => (
        <button
          key={icon}
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={() => goTo(target)}
          className="flex h-11 items-center justify-center rounded-lg bg-ink-card text-ink-text hover:bg-ink-raised disabled:opacity-30"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" clipRule="evenodd" d={ICONS[icon]} /></svg>
        </button>
      ))}
    </div>
  );
}

/**
 * A game on its own page: the board, the engine (off until switched on), the
 * moves, and ways out to Chess.com, Lichess or a PGN file. Every game in the
 * app opens here, whatever list it came from.
 */
export function AnalysisView(props: AnalysisViewProps) {
  const { pgn, white, black, orientation = "white", result, title, details, filename, shareUrl, importToLichess, back } = props;
  const mainMoves = useMemo(() => parsePgn(pgn), [pgn]);
  const line = useAnalysisLine(mainMoves);
  const { moves, index, fen, goTo } = line;
  const [prefs, setPrefs] = useAnalysisPrefs();
  const engine = useEngine(fen, { enabled: prefs.engine, depth: DEPTHS[prefs.depth].depth, capMs: DEPTHS[prefs.depth].capMs });
  const top = engine.lines[0] ?? null;

  const [selected, setSelected] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [lichessBusy, setLichessBusy] = useState(false);
  const activeMoveRef = useRef<HTMLButtonElement>(null);
  const finished = result === "1-0" || result === "0-1" || result === "1/2-1/2";

  // A sound for the move arrived at, however it was reached.
  const shownIndex = useRef(index);
  useEffect(() => {
    const previous = shownIndex.current;
    shownIndex.current = index;
    if (!prefs.sound || index === previous || index < 0) return;
    const lastOfGame = finished && !line.inBranch && index === mainMoves.length - 1;
    void playSound(soundFor(moves[index].san, lastOfGame));
  }, [index, moves, prefs.sound, finished, line.inBranch, mainMoves.length]);

  useEffect(() => {
    activeMoveRef.current?.scrollIntoView({ block: "nearest" });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      const to = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: -1, End: moves.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      goTo(to);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, moves.length, goTo]);

  const onSquareClick = useCallback(
    (square: string) => {
      if (selected === square) return setSelected(null);
      if (selected && line.play(selected, square)) return setSelected(null);
      setSelected(line.legalTargets(square).length > 0 ? square : null);
    },
    [selected, line],
  );
  const onDrop = useCallback(
    (from: string, to: string) => {
      setSelected(null);
      return line.play(from, to);
    },
    [line],
  );

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    const last = index >= 0 ? moves[index] : null;
    if (last) {
      styles[last.from] = { backgroundColor: "rgba(255, 214, 10, 0.4)" };
      styles[last.to] = { backgroundColor: "rgba(255, 214, 10, 0.55)" };
    }
    if (selected) {
      styles[selected] = { backgroundColor: "rgba(246,195,68,0.8)" };
      for (const sq of line.legalTargets(selected)) {
        styles[sq] = { background: "radial-gradient(circle, rgba(20,20,20,0.30) 22%, transparent 24%)" };
      }
    }
    const best = top?.pv[0];
    if (prefs.engine && best) {
      styles[best.slice(0, 2)] = { backgroundColor: "rgba(0,200,80,0.35)" };
      styles[best.slice(2, 4)] = { backgroundColor: "rgba(0,200,80,0.55)" };
    }
    return styles;
  }, [index, moves, selected, line, top, prefs.engine]);

  function download() {
    const url = URL.createObjectURL(new Blob([pgn], { type: "application/x-chess-pgn" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function openLichess() {
    const board = `https://lichess.org/analysis/pgn/${encodeURIComponent(movetext(mainMoves))}`;
    if (!importToLichess) {
      window.open(board, "_blank", "noopener");
      return;
    }
    setLichessBusy(true);
    try {
      window.open((await api.lichessImportProxy(pgn)).url, "_blank", "noopener");
    } catch {
      // The import failed; the analysis board still shows the game.
      window.open(board, "_blank", "noopener");
    } finally {
      setLichessBusy(false);
    }
  }

  const bar = (orientationOfBar: "vertical" | "horizontal", className: string) =>
    prefs.engine && (
      <EvalBar
        orientation={orientationOfBar}
        className={className}
        score={top?.score ?? null}
        mate={top?.mate ?? null}
        depth={engine.depth}
        isAnalyzing={engine.isAnalyzing}
        source={engine.source}
      />
    );

  const topSide = orientation === "white" ? black : white;
  const bottomSide = orientation === "white" ? white : black;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
      {sharing && <ShareSheet pgn={pgn} title={title} url={shareUrl} onClose={() => setSharing(false)} />}

      <header className="flex items-start gap-3">
        <BackButton href={back.href} label={back.label} />
        <div className="min-w-0 pt-0.5">
          <h1 className="text-balance text-[18px] font-[520] leading-tight text-ink-text sm:text-[22px]">{title}</h1>
          <p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-ink-faint">
            {details.filter(Boolean).map((d) => <span key={String(d)}>{d}</span>)}
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section aria-label="Board" className="flex justify-center gap-2">
          {bar("vertical", "hidden sm:flex")}
          <div className="flex w-full max-w-[min(100%,calc(100dvh-190px))] flex-col gap-1.5 lg:max-w-[min(100%,calc(100dvh-270px))]">
            <Plate side={topSide} color={orientation === "white" ? "black" : "white"} />
            <Board fen={fen} orientation={orientation} squareStyles={squareStyles} onDrop={onDrop} onSquareClick={onSquareClick} />
            <Plate side={bottomSide} color={orientation} />
            {bar("horizontal", "mt-0.5 sm:hidden")}
            {/* On a phone the controls sit under the board, where a thumb is. */}
            <Nav index={index} last={moves.length - 1} goTo={goTo} className="mt-2 lg:hidden" />
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-3">
          <EnginePanel prefs={prefs} setPrefs={setPrefs} engine={engine} fen={fen} />

          <section aria-label="Moves" className="rounded-xl bg-ink-card p-3">
            {moves.length === 0 ? (
              <p className="py-6 text-center text-[14px] text-ink-faint">No moves recorded for this game.</p>
            ) : (
              <div className="flex max-h-[45vh] flex-wrap content-start gap-x-1 gap-y-0.5 overflow-y-auto font-mono text-[14px] leading-relaxed lg:max-h-[calc(100dvh-520px)] lg:min-h-[160px]">
                {moves.map((mv, i) => {
                  const branched = line.branchStartsAt !== null && i >= line.branchStartsAt;
                  const current = i === index;
                  return (
                    <span key={i} className="inline-flex items-baseline">
                      {i === line.branchStartsAt && <span className="mx-0.5 select-none text-accent-soft">(</span>}
                      {mv.color === "w" && <span className="mr-0.5 select-none text-ink-faint">{mv.moveNumber}.</span>}
                      <button
                        type="button"
                        ref={current ? activeMoveRef : null}
                        onClick={() => goTo(i)}
                        className={`rounded px-1 py-0.5 ${
                          current ? "bg-accent text-accent-on" : branched ? "italic text-accent-soft hover:bg-ink-raised" : "text-ink-text hover:bg-ink-raised"
                        }`}
                      >
                        {mv.san}
                      </button>
                      {branched && i === moves.length - 1 && <span className="mx-0.5 select-none text-accent-soft">)</span>}
                    </span>
                  );
                })}
                {finished && !line.inBranch && <span className="ml-1 self-center font-[520] text-ink-text">{result.replaceAll("1/2", "½")}</span>}
              </div>
            )}
            {line.branch && (
              <button
                type="button"
                onClick={() => {
                  line.clearBranch();
                  setSelected(null);
                }}
                className="mt-3 w-full rounded-pill border border-accent px-3 py-1.5 text-[13px] font-[520] text-accent-soft hover:bg-ink-raised"
              >
                ↩ Back to the game
              </button>
            )}
          </section>

          <Nav index={index} last={moves.length - 1} goTo={goTo} className="hidden lg:grid" />

          <div className="flex flex-wrap gap-2">
            {[
              { label: "Download PGN", onClick: download },
              { label: "Chess.com", onClick: () => window.open(`https://www.chess.com/analysis?pgn=${encodeURIComponent(pgn)}`, "_blank", "noopener") },
              { label: lichessBusy ? "Opening…" : "Lichess", onClick: openLichess, disabled: lichessBusy },
              { label: "Share", onClick: () => setSharing(true) },
            ].map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                disabled={a.disabled}
                className="rounded-pill bg-ink-card px-3.5 py-2 text-[13px] text-ink-muted hover:bg-ink-raised hover:text-ink-text disabled:opacity-60"
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="hidden text-[12px] text-ink-faint lg:block">← → to step through the moves</p>
        </aside>
      </div>
    </div>
  );
}
