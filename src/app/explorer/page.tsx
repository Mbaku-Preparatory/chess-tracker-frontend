"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import type { ExplorerSource, PositionExplorer, PositionExplorerMove } from "@/types";

/**
 * The position explorer: set up any line on the board and see what strong
 * players chose next, and how those games ended.
 *
 * The line lives in the URL (`?line=e2e4,c7c5`), so a position is something
 * you can bookmark or send to a student. Moves are kept as UCI because SAN
 * needs the position to read and UCI does not.
 */

const SOURCES: { value: ExplorerSource; label: string; short: string; hint: string }[] = [
  { value: "otb", label: "Over the board", short: "OTB", hint: "Classical tournament games" },
  { value: "online", label: "Online", short: "Online", hint: "Lichess, 2500+ vs 2300+, no bullet" },
  { value: "all", label: "Both", short: "Both", hint: "Everything together" },
];

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/** White · draw · black, as one bar. Labels only where there is room for them. */
function ResultBar({ white, draws, black, tall = false }: { white: number; draws: number; black: number; tall?: boolean }) {
  const total = white + draws + black;
  const w = pct(white, total);
  const b = pct(black, total);
  const d = total > 0 ? 100 - w - b : 0;
  const height = tall ? "h-7 text-xs" : "h-5 text-[10px]";
  return (
    <div className={`flex w-full overflow-hidden rounded-md font-bold ${height}`}>
      {[
        { width: w, label: `${w}%`, cls: "bg-white text-gray-800 ring-1 ring-inset ring-gray-200 dark:ring-0" },
        { width: d, label: `${d}%`, cls: "bg-gray-400 text-white dark:bg-gray-500" },
        { width: b, label: `${b}%`, cls: "bg-gray-800 text-white dark:bg-black" },
      ].map((seg, i) =>
        seg.width > 0 ? (
          <div key={i} style={{ width: `${seg.width}%` }} className={`flex items-center justify-center ${seg.cls}`}>
            {seg.width >= (tall ? 9 : 13) ? seg.label : ""}
          </div>
        ) : null
      )}
    </div>
  );
}

function readLine(): string[] {
  if (typeof window === "undefined") return [];
  const raw = new URLSearchParams(window.location.search).get("line") ?? "";
  return raw.split(",").filter((u) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u));
}

/** Replays a UCI line, dropping everything from the first move that is not legal. */
function replayLine(line: string[]): { chess: Chess; line: string[]; sans: string[] } {
  const chess = new Chess();
  const kept: string[] = [];
  const sans: string[] = [];
  for (const uci of line) {
    try {
      const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
      kept.push(uci);
      sans.push(move.san);
    } catch {
      break;
    }
  }
  return { chess, line: kept, sans };
}

export default function ExplorerPage() {
  // The whole line, and how far along it the board is. Stepping back keeps the
  // moves ahead so you can step forward again, as in any game viewer.
  const [line, setLine] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [source, setSource] = useState<ExplorerSource>("otb");
  const [flipped, setFlipped] = useState(false);
  const [data, setData] = useState<PositionExplorer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cache = useRef(new Map<string, PositionExplorer>());

  useEffect(() => {
    const initial = replayLine(readLine());
    setLine(initial.line);
    setCursor(initial.line.length);
  }, []);

  const full = useMemo(() => replayLine(line), [line]);
  const current = useMemo(() => replayLine(line.slice(0, cursor)), [line, cursor]);
  const fen = current.chess.fen();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shown = line.slice(0, cursor);
    if (shown.length) params.set("line", shown.join(","));
    else params.delete("line");
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [line, cursor]);

  const shownLine = useMemo(() => line.slice(0, cursor), [line, cursor]);

  useEffect(() => {
    const key = `${source}|${shownLine.join(",")}`;
    const hit = cache.current.get(key);
    if (hit) {
      setData(hit);
      return;
    }
    let live = true;
    setError(null);
    api
      .getPositionExplorer(fen, source, shownLine)
      .then((body) => {
        cache.current.set(key, body);
        if (live) setData(body);
      })
      .catch((err) => live && setError(userMessage(err, "Couldn't load this position.")));
    return () => {
      live = false;
    };
  }, [fen, source, shownLine]);

  // The last named opening on the way to this position: most positions past
  // the book have no name of their own, and the header going blank one move
  // after "Najdorf" would be the wrong answer.
  const [openingName, setOpeningName] = useState<{ eco_code: string; name: string } | null>(null);
  useEffect(() => {
    if (cursor === 0) setOpeningName(null);
    else if (data?.fen === fen && data.opening) setOpeningName(data.opening);
  }, [data, fen, cursor]);

  const play = useCallback(
    (uci: string) => {
      const next = [...line.slice(0, cursor), uci];
      // Playing the move already next in the line just steps forward, so
      // the rest of the line survives.
      if (line[cursor] === uci) {
        setCursor(cursor + 1);
        return true;
      }
      if (replayLine(next).line.length !== next.length) return false;
      setLine(next);
      setCursor(next.length);
      return true;
    },
    [line, cursor]
  );

  const tryMove = useCallback(
    (from: string, to: string) => {
      const piece = current.chess.get(from as Square);
      const promotes = piece?.type === "p" && (to[1] === "8" || to[1] === "1");
      return play(`${from}${to}${promotes ? "q" : ""}`);
    },
    [current, play]
  );

  const onSquareClick = useCallback(
    (square: string) => {
      if (selected === square) return setSelected(null);
      if (selected && tryMove(selected, square)) return setSelected(null);
      const moves = current.chess.moves({ square: square as Square });
      setSelected(moves.length ? square : null);
    },
    [selected, tryMove, current]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") setCursor((c) => Math.max(0, c - 1));
      else if (e.key === "ArrowRight") setCursor((c) => Math.min(line.length, c + 1));
      else if (e.key === "Home") setCursor(0);
      else if (e.key === "End") setCursor(line.length);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [line.length]);

  const lastMove = cursor > 0 ? line[cursor - 1] : null;
  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.slice(0, 2)] = { backgroundColor: "rgba(246,195,68,0.35)" };
      styles[lastMove.slice(2, 4)] = { backgroundColor: "rgba(246,195,68,0.5)" };
    }
    if (selected) {
      styles[selected] = { backgroundColor: "rgba(246,195,68,0.8)" };
      for (const m of current.chess.moves({ square: selected as Square, verbose: true })) {
        styles[m.to] = { background: "radial-gradient(circle, rgba(20,20,20,0.30) 22%, transparent 24%)" };
      }
    }
    return styles;
  }, [lastMove, selected, current]);

  const arrows = hovered
    ? [{ startSquare: hovered.slice(0, 2), endSquare: hovered.slice(2, 4), color: "rgba(74,124,89,0.85)" }]
    : [];

  const fresh = data?.fen === fen ? data : null;
  const moves: PositionExplorerMove[] = fresh?.moves ?? [];
  const total = fresh?.games ?? 0;
  const pgn = full.sans
    .map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${san}` : san))
    .join(" ");

  async function copyFen() {
    try {
      await navigator.clipboard.writeText(fen);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard refused (insecure context, permissions): the FEN is on screen to select.
    }
  }

  const navButton =
    "flex h-9 flex-1 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 dark:border-dark-border dark:text-gray-300 dark:hover:bg-dark-elevated";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Explorer</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Play any line and see what strong players chose next — and how it went.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Board column */}
        <div className="w-full lg:w-[min(44vw,calc(100dvh-280px))] lg:shrink-0">
          <Chessboard
            options={{
              position: fen,
              boardOrientation: flipped ? "black" : "white",
              onPieceDrop: ({ sourceSquare, targetSquare }) =>
                targetSquare ? tryMove(sourceSquare, targetSquare) : false,
              onSquareClick: ({ square }) => onSquareClick(square),
              squareStyles,
              arrows,
              boardStyle: { borderRadius: "8px" },
              darkSquareStyle: { backgroundColor: "#4a7c59" },
              lightSquareStyle: { backgroundColor: "#f0d9b5" },
              animationDurationInMs: 150,
            }}
          />

          <div className="mt-3 flex gap-2">
            <button type="button" className={navButton} onClick={() => setCursor(0)} disabled={cursor === 0} title="Start (Home)">
              «
            </button>
            <button type="button" className={navButton} onClick={() => setCursor(cursor - 1)} disabled={cursor === 0} title="Back (←)">
              ‹
            </button>
            <button type="button" className={navButton} onClick={() => setCursor(cursor + 1)} disabled={cursor >= line.length} title="Forward (→)">
              ›
            </button>
            <button type="button" className={navButton} onClick={() => setCursor(line.length)} disabled={cursor >= line.length} title="End (End)">
              »
            </button>
            <button type="button" className={navButton} onClick={() => setFlipped((f) => !f)} title="Flip board">
              ⇅
            </button>
          </div>

          {/* The line, every move clickable. Moves past the cursor stay, dimmed. */}
          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3 text-sm dark:border-dark-border dark:bg-dark-surface">
            {full.sans.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500">Make a move on the board, or pick one from the list.</p>
            ) : (
              <div className="flex flex-wrap gap-x-1 gap-y-1 leading-6">
                {full.sans.map((san, i) => (
                  <span key={i} className="flex items-center">
                    {i % 2 === 0 && <span className="mr-1 text-gray-400 dark:text-gray-500">{i / 2 + 1}.</span>}
                    <button
                      type="button"
                      onClick={() => setCursor(i + 1)}
                      className={`rounded px-1 font-medium transition ${
                        i + 1 === cursor
                          ? "bg-brand-600 text-white"
                          : i < cursor
                            ? "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-elevated"
                            : "text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-dark-elevated"
                      }`}
                    >
                      {san}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Data column */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Source */}
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-dark-border dark:bg-dark-surface">
            {SOURCES.map((s) => (
              <button
                key={s.value}
                type="button"
                title={s.hint}
                onClick={() => setSource(s.value)}
                className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
                  source === s.value
                    ? "bg-brand-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-elevated"
                }`}
              >
                <span className="sm:hidden">{s.short}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-border dark:bg-dark-surface">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {openingName ? openingName.eco_code : "Position"}
            </p>
            <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-gray-100">
              {cursor === 0 ? "Starting position" : openingName?.name ?? "Unnamed position"}
            </p>
            {fresh && total > 0 && (
              <>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-bold text-brand-700 dark:text-brand-400">{total.toLocaleString()}</span>{" "}
                  {total === 1 ? "game" : "games"} reached this position
                </p>
                <div className="mt-2">
                  <ResultBar white={fresh.white ?? 0} draws={fresh.draws ?? 0} black={fresh.black ?? 0} tall />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-gray-400 dark:text-gray-500">
                  <span>White wins</span>
                  <span>Draws</span>
                  <span>Black wins</span>
                </div>
              </>
            )}
          </div>

          {/* Moves */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-dark-border dark:bg-dark-surface">
            <div className="grid grid-cols-[4.5rem_4.5rem_1fr] gap-3 border-b border-gray-100 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:border-dark-border dark:text-gray-500">
              <span>Move</span>
              <span className="text-right">Games</span>
              <span>Result</span>
            </div>

            {error ? (
              <p className="px-4 py-6 text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : data && !data.available ? (
              <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                The explorer is being built. Check back shortly.
              </p>
            ) : !fresh ? (
              <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500">Loading…</p>
            ) : moves.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                No {source === "online" ? "online" : source === "otb" ? "over-the-board" : ""} games reached this
                position{source !== "all" ? " — try another source" : ""}.
              </p>
            ) : (
              <ul className="max-h-[60vh] overflow-y-auto">
                {moves.map((m) => (
                  <li key={m.uci}>
                    <button
                      type="button"
                      onClick={() => {
                        setHovered(null);
                        play(m.uci);
                      }}
                      onMouseEnter={() => setHovered(m.uci)}
                      onMouseLeave={() => setHovered(null)}
                      className="grid w-full grid-cols-[4.5rem_4.5rem_1fr] items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-brand-50 dark:hover:bg-brand-900/20"
                    >
                      <span className="font-bold text-gray-900 dark:text-gray-100">{m.san}</span>
                      <span className="text-right tabular-nums text-gray-600 dark:text-gray-300">
                        {compact(m.games)}
                        <span className="ml-1 text-[10px] text-gray-400">{pct(m.games, total)}%</span>
                      </span>
                      <ResultBar white={m.white} draws={m.draws} black={m.black} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* FEN + PGN */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs dark:border-dark-border dark:bg-dark-surface">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">FEN</span>
              <button type="button" onClick={copyFen} className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1 break-all font-mono text-gray-700 dark:text-gray-300">{fen}</p>
            {pgn && (
              <>
                <p className="mt-3 font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">PGN</p>
                <p className="mt-1 font-mono text-gray-700 dark:text-gray-300">{pgn}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
