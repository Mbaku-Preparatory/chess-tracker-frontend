"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

import { useAnalysisLine } from "@/lib/chess/useAnalysisLine";
import type { MasterGame } from "@/types";
import { api } from "@/lib/api";
import { NO_SCORES, scoresFromResultTag } from "@/lib/chessScore";
import { EvalBar } from "@/components/ui/EvalBar";
import { useStockfish, parseUciMove } from "@/hooks/useStockfish";

// ── PGN builder ───────────────────────────────────────────────────────────────

function buildFullPgn(game: MasterGame): string {
  const lines: string[] = [];
  lines.push(`[White "${game.white}"]`);
  lines.push(`[Black "${game.black}"]`);
  if (game.white_elo) lines.push(`[WhiteElo "${game.white_elo}"]`);
  if (game.black_elo) lines.push(`[BlackElo "${game.black_elo}"]`);
  lines.push(`[Result "${game.result}"]`);
  if (game.eco) lines.push(`[ECO "${game.eco}"]`);
  if (game.opening_name) lines.push(`[Opening "${game.opening_name}"]`);
  if (game.event) lines.push(`[Event "${game.event}"]`);
  if (game.site) lines.push(`[Site "${game.site}"]`);
  if (game.year) lines.push(`[Date "${game.year}.??.??"]`);
  lines.push("");
  lines.push(game.moves ?? "");
  return lines.join("\n");
}

function pgnFilename(game: MasterGame): string {
  const w = game.white.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");
  const b = game.black.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");
  return `${w}_vs_${b}_${game.year ?? "?"}_${game.result.replace("/", "-")}.pgn`;
}

// ── Board name plates ─────────────────────────────────────────────────────────

/**
 * One name plate, sized to the board it sits against so long GM names truncate
 * instead of widening the column on a narrow phone. The board here is always
 * drawn from white's side, so white takes the bottom plate.
 */
function PlayerPlate({
  name,
  rating,
  color,
  score,
}: {
  name: string;
  rating?: number | null;
  color: "white" | "black";
  score?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 px-0.5">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full border ${
          color === "white"
            ? "border-gray-300 bg-white"
            : "border-gray-600 bg-gray-800 dark:border-gray-500"
        }`}
        aria-hidden
      />
      <span className="min-w-0 truncate text-xs font-semibold text-gray-900 dark:text-gray-100 sm:text-sm">
        {name}
      </span>
      {score && (
        <span
          className="shrink-0 text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100 sm:text-sm"
          title="Final score"
        >
          ({score})
        </span>
      )}
      {/* ml-auto keeps the rating on the right edge; without it the score
          would be pushed out there with it, away from the name. */}
      {rating && (
        <span className="ml-auto shrink-0 text-[11px] font-normal tabular-nums text-gray-400 dark:text-gray-500 sm:text-xs">
          {rating}
        </span>
      )}
    </div>
  );
}

// ── Move parser ───────────────────────────────────────────────────────────────

interface ParsedMove {
  san: string;
  fen: string;
  from: string;
  to: string;
  moveNumber: number;
  color: "w" | "b";
}

function parsePgn(pgn: string): ParsedMove[] {
  const chess = new Chess();
  try { chess.loadPgn(pgn); } catch { return []; }
  const history = chess.history({ verbose: true });
  const parsed: ParsedMove[] = [];
  const replay = new Chess();
  for (const move of history) {
    replay.move(move.san);
    parsed.push({
      san: move.san,
      fen: replay.fen(),
      from: move.from,
      to: move.to,
      moveNumber: Math.ceil((parsed.length + 1) / 2),
      color: move.color,
    });
  }
  return parsed;
}

// ── Share sheet ───────────────────────────────────────────────────────────────

function ShareSheet({ pgn, game, onClose }: { pgn: string; game: MasterGame; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function copy() {
    await navigator.clipboard.writeText(pgn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const title = `${game.white} vs ${game.black} (${game.result}) — ${game.event ?? ""} ${game.year ?? ""}`.trim();
  const snippet = pgn.slice(0, 1500);

  const platforms = [
    {
      label: "Copy", bg: "bg-gray-700",
      action: copy,
      icon: copied
        ? <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        : <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    },
    {
      label: "WhatsApp", bg: "bg-[#25D366]",
      action: () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`GM game PGN:\n\n${snippet}`)}`, "_blank", "noopener"),
      icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>,
    },
    {
      label: "Telegram", bg: "bg-[#229ED9]",
      action: () => window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(`GM game PGN:\n\n${snippet}`)}`, "_blank", "noopener"),
      icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>,
    },
    {
      label: "X / Twitter", bg: "bg-black",
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${game.white} vs ${game.black} (${game.result})\n${game.event ?? ""} ${game.year ?? ""}\n\n${pgn.slice(0, 200)}…`)}`, "_blank", "noopener"),
      icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
    },
    {
      label: "Email", bg: "bg-gray-500",
      action: () => window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(snippet)}`, "_self"),
      icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white px-5 pb-8 pt-5 shadow-2xl dark:bg-dark-surface sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Share PGN</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-elevated transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="mb-5 flex items-start gap-5 overflow-x-auto pb-1">
          {platforms.map((p) => (
            <button key={p.label} onClick={p.action} className="flex flex-col items-center gap-1.5 shrink-0">
              <span className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${p.bg}`}>{p.icon}</span>
              <span className="text-[11px] text-gray-600 dark:text-gray-400">{p.label === "Copy" && copied ? "Copied!" : p.label}</span>
            </button>
          ))}
        </div>
        <hr className="mb-4 border-gray-100 dark:border-dark-border" />
        <div className="flex items-stretch gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-dark-border dark:bg-dark-elevated">
          <textarea ref={textRef} readOnly value={pgn} rows={2} className="min-w-0 flex-1 resize-none bg-transparent font-mono text-[11px] text-gray-500 focus:outline-none dark:text-gray-400" onClick={() => textRef.current?.select()} />
          <button onClick={copy} className="shrink-0 self-center rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700">{copied ? "Copied!" : "Copy"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Nav button (shared style) ─────────────────────────────────────────────────

function NavBtn({ label, icon, disabled, onClick }: { label: string; icon: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button aria-label={label} disabled={disabled} onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-dark-border dark:text-gray-400 dark:hover:bg-dark-elevated">
      {icon}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MasterGameViewerModal({ game, onClose }: { game: MasterGame; onClose: () => void }) {
  const pgn = buildFullPgn(game);
  const gameMoves = parsePgn(pgn);
  // A master game's `result` is already the PGN token ("1-0"), so it needs no
  // colour to read — unlike a scouted Game, whose result is stored relative to
  // the player being scouted.
  const scores = scoresFromResultTag(game.result) ?? NO_SCORES;

  const [showShare, setShowShare] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<"lichess" | null>(null);
  const moveListRef = useRef<HTMLDivElement>(null);
  const activeMoveRef = useRef<HTMLButtonElement>(null);

  // The game is never edited. Playing a move that leaves it opens a branch,
  // and `line.moves` reads the game up to that point followed by the branch.
  const line = useAnalysisLine(gameMoves);
  const { moves, index: currentIndex, fen: currentFen, goTo } = line;

  // Click a piece to pick it up, click a legal square to move. Clicking
  // another of your own pieces switches to it rather than failing, which is
  // what people expect and costs nothing.
  const handleSquareClick = useCallback(
    (square: string) => {
      if (selected === square) return setSelected(null);
      if (selected && line.play(selected, square)) return setSelected(null);
      setSelected(line.legalTargets(square).length > 0 ? square : null);
    },
    [selected, line]
  );

  const handleDrop = useCallback(
    (from: string, to: string) => {
      setSelected(null);
      return line.play(from, to);
    },
    [line]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goTo(currentIndex + 1); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goTo(currentIndex - 1); }
      else if (e.key === "Home") { e.preventDefault(); goTo(-1); }
      else if (e.key === "End") { e.preventDefault(); goTo(moves.length - 1); }
      else if (e.key === "Escape") { onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // currentIndex is a dependency now, where it was not before: navigation
    // used React's own setter, whose identity is stable and whose functional
    // form always saw fresh state. goTo closes over the current position
    // instead, so the listener has to be rebound as it moves — otherwise the
    // arrow keys step from wherever the modal was opened, forever.
  }, [moves.length, onClose, goTo, currentIndex]);

  useEffect(() => {
    activeMoveRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentIndex]);

  const engine = useStockfish(currentFen, moves.length > 0);
  const bestMoveSquares = parseUciMove(engine.bestMove);

  const highlightSquares: Record<string, React.CSSProperties> = {};
  if (currentIndex >= 0) {
    const mv = moves[currentIndex];
    if (mv) {
      highlightSquares[mv.from] = { backgroundColor: "rgba(255, 214, 10, 0.4)" };
      highlightSquares[mv.to]   = { backgroundColor: "rgba(255, 214, 10, 0.55)" };
    }
  }

  function handleDownload() {
    const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pgnFilename(game);
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleAnalysis(platform: "chesscom" | "lichess") {
    if (platform === "chesscom") {
      window.open(`https://www.chess.com/analysis?pgn=${encodeURIComponent(pgn)}`, "_blank", "noopener");
      return;
    }
    setAnalysisLoading("lichess");
    try {
      const data = await api.lichessImportProxy(pgn);
      window.open(data.url, "_blank", "noopener");
    } catch { /* silent */ } finally {
      setAnalysisLoading(null);
    }
  }

  const resultLabel = game.result === "1/2-1/2" ? "½–½" : game.result === "1-0" ? "1–0" : "0–1";

  return (
    <>
      {showShare && <ShareSheet pgn={pgn} game={game} onClose={() => setShowShare(false)} />}

      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="relative flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-dark-surface sm:max-h-[92dvh] sm:max-w-7xl sm:rounded-2xl">

          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-dark-border sm:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {game.white}
                  {game.white_elo && <span className="ml-1 text-sm font-normal text-gray-400">({game.white_elo})</span>}
                  <span className="mx-2 font-normal text-gray-400">vs</span>
                  {game.black}
                  {game.black_elo && <span className="ml-1 text-sm font-normal text-gray-400">({game.black_elo})</span>}
                </span>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${
                  game.result === "1-0" ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : game.result === "0-1" ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-200 text-gray-700 dark:bg-dark-elevated dark:text-gray-300"
                }`}>{resultLabel}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                {game.year && <span>{game.year}</span>}
                {game.event && <span className="truncate">{game.event}</span>}
                {game.opening_name && <span className="truncate text-brand-600 dark:text-brand-400">{game.eco} · {game.opening_name}</span>}
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-dark-elevated" aria-label="Close">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            {/* Board + eval bar */}
            <div className="flex shrink-0 items-center justify-center gap-2 bg-gray-50 p-2 dark:bg-dark-elevated sm:p-5">
              {/* Vertical beside the board on a wide screen; below `sm` the
                  board wants the whole width, so a column here would squeeze
                  the board rather than the bar. The horizontal one under the
                  board takes over there. */}
              <EvalBar
                className="hidden sm:flex"
                score={engine.score}
                mate={engine.mate}
                depth={engine.depth}
                isAnalyzing={engine.isAnalyzing}
                source={engine.source}
              />
              {/* Sized against the viewport rather than capped at a fixed 420.
                  On a phone the board is square and full width, so its height
                  is the screen's width — enough to push the move list off a
                  short screen. The max-w bound reserves room for the header,
                  plates, controls and some moves, and the max() floor stops
                  that reservation shrinking the board to nothing.
                On a phone the board is square and full width, so its height is
                the screen's width — enough to push the move list off a short
                screen entirely. The max-w bound reserves room for the header,
                plates, controls and some moves, and the max() floor stops that
                reservation shrinking the board to nothing on a small device.
                  The board is square, so its height is its width — the `dvh`
                  term is what stops a wide monitor producing a board taller
                  than the modal. */}
              <div
                className="flex w-full max-w-[max(220px,calc(95dvh-330px))] flex-col gap-1.5 sm:w-[min(52vw,calc(92dvh-190px))] sm:max-w-none"
                style={{ minWidth: 220 }}
              >
                <PlayerPlate name={game.black} rating={game.black_elo} color="black" score={scores.black} />
                <Chessboard
                  options={{
                    position: currentFen,
                    boardOrientation: "white",
                    // Play your own moves. The game is untouched — a move that
                    // leaves it opens a branch instead.
                    allowDragging: true,
                    onPieceDrop: ({ sourceSquare, targetSquare }) =>
                      targetSquare ? handleDrop(sourceSquare, targetSquare) : false,
                    onSquareClick: ({ square }) => handleSquareClick(square),
                    squareStyles: {
                      ...highlightSquares,
                      ...(selected ? { [selected]: { backgroundColor: "rgba(246,195,68,0.8)" } } : {}),
                      // A dot on an empty square, a ring on an occupied one:
                      // a dot centred over a piece hides the piece, and what
                      // you are about to capture matters more than the dot.
                      ...Object.fromEntries(
                        (selected ? line.legalTargets(selected) : []).map((sq) => [
                          sq,
                          {
                            background:
                              "radial-gradient(circle, rgba(20,20,20,0.30) 22%, transparent 24%)",
                          },
                        ])
                      ),
                      ...(bestMoveSquares
                        ? {
                            [bestMoveSquares[0]]: { backgroundColor: "rgba(0,200,80,0.35)" },
                            [bestMoveSquares[1]]: { backgroundColor: "rgba(0,200,80,0.55)" },
                          }
                        : {}),
                    },
                    // The engine's suggested move is not drawn. An arrow on
                    // the board reads as something that happened in the game
                    // rather than a suggestion, which is confusing next to the
                    // yellow last-move highlight. The engine still drives the
                    // eval bar. Restore by passing bestMoveSquares here.
                    arrows: [],
                    boardStyle: { borderRadius: "8px", boxShadow: "0 4px 24px rgba(0,0,0,0.12)" },
                    darkSquareStyle: { backgroundColor: "#4a7c59" },
                    lightSquareStyle: { backgroundColor: "#f0d9b5" },
                    animationDurationInMs: 150,
                  }}
                />
                <PlayerPlate name={game.white} rating={game.white_elo} color="white" score={scores.white} />
                <EvalBar
                  orientation="horizontal"
                  className="mt-0.5 sm:hidden"
                  score={engine.score}
                  mate={engine.mate}
                  depth={engine.depth}
                  isAnalyzing={engine.isAnalyzing}
                  source={engine.source}
                />
              </div>
            </div>

            {/* Move list + controls */}
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Move list */}
              <div ref={moveListRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-4">
                {moves.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-600">No moves available</div>
                ) : (
                  <div className="flex flex-wrap gap-x-1 gap-y-0.5 py-1 text-sm font-mono leading-relaxed">
                    {moves.map((mv, idx) => {
                      const branched = line.branchStartsAt !== null && idx >= line.branchStartsAt;
                      const current = idx === currentIndex;
                      return (
                        <span key={idx} className="inline-flex items-baseline">
                          {/* Where the game stops and your line starts. */}
                          {idx === line.branchStartsAt && (
                            <span className="mx-0.5 select-none text-brand-600 dark:text-brand-400">(</span>
                          )}
                          {mv.color === "w" && (
                            <span className="mr-0.5 select-none text-gray-400 dark:text-gray-600">{mv.moveNumber}.</span>
                          )}
                          <button
                            ref={current ? activeMoveRef : null}
                            onClick={() => goTo(idx)}
                            className={`rounded px-1 py-0.5 transition-colors ${
                              current
                                ? "bg-brand-600 text-white"
                                : branched
                                  ? "italic text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/30"
                                  : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-elevated"
                            }`}
                          >
                            {mv.san}
                          </button>
                          {branched && idx === moves.length - 1 && (
                            <span className="mx-0.5 select-none text-brand-600 dark:text-brand-400">)</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}

                {line.branch && (
                  <button
                    type="button"
                    onClick={() => {
                      line.clearBranch();
                      setSelected(null);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-600 px-3 py-1 text-xs font-bold text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/30"
                  >
                    ↩ Back to the game
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="shrink-0 flex items-center justify-end gap-2 border-t border-gray-100 dark:border-dark-border px-3 py-2 sm:px-4">
                <button onClick={handleDownload} aria-label="Download PGN" title="Download PGN"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-dark-border dark:text-gray-400 dark:hover:bg-dark-elevated">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
                <button onClick={() => handleAnalysis("chesscom")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-[#7fa650]/40 hover:bg-[#7fa650]/5 dark:border-dark-border dark:text-gray-400">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-[#7fa650]"><path d="M10 2a1 1 0 00-1 1v1H8a3 3 0 00-3 3v1H4a1 1 0 000 2h1v1a3 3 0 003 3h.17l-1.9 4.55A1 1 0 007.2 20h9.6a1 1 0 00.93-1.45L15.83 14H16a3 3 0 003-3v-1h1a1 1 0 000-2h-1V7a3 3 0 00-3-3h-1V3a1 1 0 00-1-1h-4z" /></svg>
                  Chess.com
                </button>
                <button onClick={() => handleAnalysis("lichess")} disabled={analysisLoading === "lichess"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-[#b05000]/40 hover:bg-[#b05000]/5 disabled:opacity-60 dark:border-dark-border dark:text-gray-400">
                  {analysisLoading === "lichess"
                    ? <svg className="h-3.5 w-3.5 animate-spin text-[#b05000]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    : <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-[#b05000]"><path d="M19 22H5v-2h14v2M13 2a3 3 0 00-3 3c0 .88.39 1.67 1 2.22V8l-3 1-2 4h2v1H6l-1 3h14l-1-3h-2v-1h2l-2-4-3-1V7.22c.61-.55 1-1.34 1-2.22a3 3 0 00-1-2.24V2h-1z" /></svg>}
                  {analysisLoading === "lichess" ? "Opening…" : "Lichess"}
                </button>
                <button onClick={() => setShowShare(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-dark-border dark:text-gray-400 dark:hover:bg-dark-elevated">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  Share
                </button>
              </div>

              {/* Navigation */}
              <div className="shrink-0 border-t border-gray-100 dark:border-dark-border px-3 py-3 sm:px-4">
                <div className="flex items-center justify-center gap-2">
                  <NavBtn label="Start" disabled={currentIndex === -1} onClick={() => goTo(-1)}
                    icon={<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" /></svg>} />
                  <NavBtn label="Previous" disabled={currentIndex === -1} onClick={() => goTo(currentIndex - 1)}
                    icon={<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>} />
                  <span className="min-w-[4rem] text-center text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {currentIndex === -1 ? "Start" : `${moves[currentIndex]?.moveNumber ?? ""}${moves[currentIndex]?.color === "w" ? "." : "…"}`}
                  </span>
                  <NavBtn label="Next" disabled={currentIndex === moves.length - 1} onClick={() => goTo(currentIndex + 1)}
                    icon={<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>} />
                  <NavBtn label="End" disabled={currentIndex === moves.length - 1} onClick={() => goTo(moves.length - 1)}
                    icon={<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z" /></svg>} />
                </div>
                <p className="mt-1.5 text-center text-[10px] text-gray-400 dark:text-gray-600">← → arrow keys to navigate</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
