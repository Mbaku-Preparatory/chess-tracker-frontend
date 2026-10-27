"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { hasInAppHistory } from "@/components/NavigationMemory";
import { EvalBar } from "@/components/ui/EvalBar";
import { DEPTHS, useAnalysisPrefs } from "@/lib/analysisPrefs";
import { api } from "@/lib/api";
import { movetext, parsePgn } from "@/lib/chess/pgn";
import { useAnalysisLine } from "@/lib/chess/useAnalysisLine";
import { useEngine } from "@/hooks/useEngine";

import { EnginePanel } from "./EnginePanel";
import { MoveList } from "./MoveList";
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
  /** Where Back goes when the page was not opened from inside the site. */
  back: { href: string };
}

function BackButton({ href }: { href: string }) {
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
      className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border-2 border-accent px-3.5 py-1.5 text-[14px] font-[520] text-accent-soft hover:bg-accent hover:text-accent-on"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back
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

const ICON_DOWNLOAD = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const ICON_SHARE = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);
// Chess.com's pawn in its green, to say where the button goes.
const ICON_CHESSCOM = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="5.5" r="3.5" fill="#81b64c" />
    <path fill="#81b64c" d="M9.2 9.5h5.6l-.9 4.2c1.9.9 3.3 2.6 3.6 4.6H6.5c.3-2 1.7-3.7 3.6-4.6zM5.5 19.5h13a1.5 1.5 0 010 3h-13a1.5 1.5 0 010-3z" />
  </svg>
);
// Lichess's own mark (lila public/logo/lichess.svg, which lila licenses for
// referring to lichess.org, as this button does).
const ICON_LICHESS = (
  <svg className="h-4 w-4" viewBox="0 0 50 50" aria-hidden>
    <path fill="currentColor" stroke="currentColor" strokeLinejoin="round" d="M38.956.5c-3.53.418-6.452.902-9.286 2.984C5.534 1.786-.692 18.533.68 29.364 3.493 50.214 31.918 55.785 41.329 41.7c-7.444 7.696-19.276 8.752-28.323 3.084S-.506 27.392 4.683 17.567C9.873 7.742 18.996 4.535 29.03 6.405c2.43-1.418 5.225-3.22 7.655-3.187l-1.694 4.86 12.752 21.37c-.439 5.654-5.459 6.112-5.459 6.112-.574-1.47-1.634-2.942-4.842-6.036-3.207-3.094-17.465-10.177-15.788-16.207-2.001 6.967 10.311 14.152 14.04 17.663 3.73 3.51 5.426 6.04 5.795 6.756 0 0 9.392-2.504 7.838-8.927L37.4 7.171z" />
  </svg>
);

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
  const finished = result === "1-0" || result === "0-1" || result === "1/2-1/2";

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
        <BackButton href={back.href} />
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

          <section aria-label="Moves" className="max-h-[45vh] overflow-y-auto rounded-xl bg-ink-card p-2 lg:max-h-[calc(100dvh-520px)] lg:min-h-[160px]">
            <MoveList mainMoves={mainMoves} line={line} result={finished ? result : null} />
          </section>

          <Nav index={index} last={moves.length - 1} goTo={goTo} className="hidden lg:grid" />

          <div className="flex flex-wrap gap-2">
            {[
              { label: "Download PGN", icon: ICON_DOWNLOAD, onClick: download },
              { label: "Chess.com", icon: ICON_CHESSCOM, onClick: () => window.open(`https://www.chess.com/analysis?pgn=${encodeURIComponent(pgn)}`, "_blank", "noopener") },
              { label: lichessBusy ? "Opening…" : "Lichess", icon: ICON_LICHESS, onClick: openLichess, disabled: lichessBusy },
              { label: "Share", icon: ICON_SHARE, onClick: () => setSharing(true) },
            ].map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                disabled={a.disabled}
                aria-label={a.label}
                title={a.label}
                className="inline-flex items-center gap-2 rounded-pill bg-ink-card px-3 py-2 text-[13px] text-ink-muted hover:bg-ink-raised hover:text-ink-text disabled:opacity-60"
              >
                {a.icon}
                {/* Icons alone on a phone: four labelled buttons do not fit a row. */}
                <span className="hidden sm:inline">{a.label}</span>
              </button>
            ))}
          </div>
          <p className="hidden text-[12px] text-ink-faint lg:block">← → to step through the moves</p>
        </aside>
      </div>
    </div>
  );
}
