"use client";

import { Chess } from "chess.js";
import { useEffect, useRef, useState } from "react";

/**
 * Engine lines for a position. Nothing here runs on our servers.
 *
 * ① A position already analysed this visit is answered from memory.
 * ② Lichess's cloud eval: positions Lichess has analysed, usually far deeper
 *    than a browser could go. Used only when it is at least as deep as asked.
 * ③ Stockfish in the browser (public/stockfish.js), to the chosen depth with a
 *    time cap. The worker is created only the first time ② misses.
 *
 * Scores are always from White's side. Lichess reports them that way; UCI
 * reports the side to move's, so a local score is flipped when Black is to
 * move. (The viewer this replaces read UCI scores as White's, so the bar
 * pointed the wrong way on every Black move Lichess did not know.)
 */
export interface EngineLine {
  score: number | null; // centipawns, positive = White better
  mate: number | null;  // moves to mate, positive = White mates
  pv: string[];         // UCI moves, e.g. ["e2e4", "e7e5"]
}

export interface EngineResult {
  lines: EngineLine[];
  depth: number;
  isAnalyzing: boolean;
  source: "lichess" | "local" | null;
}

export const MULTI_PV = 3;

const EMPTY: EngineResult = { lines: [], depth: 0, isAnalyzing: false, source: null };
const DEBOUNCE_MS = 80;

// ── Display helpers ───────────────────────────────────────────────────────────

/** Centipawns to White's winning share (0–100), for the eval bar. */
export function cpToWhitePct(score: number | null, mate: number | null): number {
  if (mate !== null) return mate > 0 ? 97 : 3;
  if (score === null) return 50;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * score)) - 1);
}

/** "+1.30", "-0.50", "M3", "M-7". */
export function formatScore(score: number | null, mate: number | null): string {
  if (mate !== null) return `M${mate}`;
  if (score === null) return "0.00";
  const pawns = score / 100;
  return (pawns >= 0 ? "+" : "") + pawns.toFixed(2);
}

/** A line's first moves as SAN with move numbers: "21… Nf6 22. Bg5 h6". */
export function pvToSan(fen: string, pv: string[], max = 8): string {
  const chess = new Chess(fen);
  const parts: string[] = [];
  for (const uci of pv.slice(0, max)) {
    const white = chess.turn() === "w";
    const number = chess.moveNumber();
    let san: string;
    try {
      san = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
    } catch {
      break;
    }
    if (white) parts.push(`${number}. ${san}`);
    else parts.push(parts.length === 0 ? `${number}… ${san}` : san);
  }
  return parts.join(" ");
}

// ── Memory ────────────────────────────────────────────────────────────────────

interface Cached {
  lines: EngineLine[];
  depth: number;
  source: "lichess" | "local";
  /** The depth asked for. A capped search may stop short of it, and asking
   * again for the same depth would only stop short again. */
  target: number;
}

const memory = new Map<string, Cached>();

function remembered(fen: string, depth: number): Cached | null {
  const hit = memory.get(fen);
  return hit && (hit.depth >= depth || hit.target >= depth) ? hit : null;
}

// ── Lichess cloud eval ────────────────────────────────────────────────────────

async function cloudEval(fen: string, signal: AbortSignal): Promise<Omit<Cached, "target"> | null> {
  try {
    const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=${MULTI_PV}`;
    const resp = await fetch(url, { headers: { Accept: "application/json" }, signal });
    if (!resp.ok) return null; // 404: Lichess has not analysed this position
    const data = await resp.json();
    const lines: EngineLine[] = (data.pvs ?? []).map((pv: { cp?: number; mate?: number; moves?: string }) => ({
      score: typeof pv.cp === "number" ? pv.cp : null,
      mate: typeof pv.mate === "number" ? pv.mate : null,
      pv: (pv.moves ?? "").split(" ").filter(Boolean),
    }));
    return lines.length ? { lines, depth: data.depth ?? 0, source: "lichess" } : null;
  } catch {
    return null;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface Search {
  fen: string;
  target: number;
  capMs: number;
  whiteToMove: boolean;
  lines: EngineLine[];
  depth: number;
}

export function useEngine(fen: string, opts: { enabled: boolean; depth: number; capMs: number }): EngineResult {
  const { enabled, depth, capMs } = opts;
  const [result, setResult] = useState<EngineResult>(EMPTY);

  const workerRef = useRef<Worker | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<Search | null>(null);
  const searchRef = useRef<Search | null>(null);
  const searchingRef = useRef(false);
  // A stopped search still answers with one last "bestmove", and its info
  // lines can arrive after the next position was asked for. Count the
  // bestmoves still owed and ignore everything until they are in.
  const staleRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  function stopLocal() {
    if (searchingRef.current && workerRef.current) {
      workerRef.current.postMessage("stop");
      staleRef.current += 1;
    }
    searchingRef.current = false;
    pendingRef.current = null;
  }

  function begin(worker: Worker, search: Search) {
    searchRef.current = search;
    searchingRef.current = true;
    worker.postMessage(`position fen ${search.fen}`);
    worker.postMessage(`go depth ${search.target} movetime ${search.capMs}`);
  }

  function onLine(line: string) {
    if (line === "readyok") {
      readyRef.current = true;
      if (pendingRef.current && workerRef.current) {
        begin(workerRef.current, pendingRef.current);
        pendingRef.current = null;
      }
      return;
    }
    if (line.startsWith("bestmove")) {
      if (staleRef.current > 0) {
        staleRef.current -= 1;
        return;
      }
      const search = searchRef.current;
      searchingRef.current = false;
      if (!search) return;
      const lines = search.lines.filter(Boolean);
      if (lines.length) {
        memory.set(search.fen, { lines, depth: search.depth, source: "local", target: search.target });
      }
      setResult((prev) => ({ ...prev, isAnalyzing: false }));
      return;
    }
    if (staleRef.current > 0 || !line.startsWith("info") || !line.includes(" pv ")) return;
    // A bound is a guess the search is about to correct; showing it flickers.
    if (line.includes("lowerbound") || line.includes("upperbound")) return;
    const search = searchRef.current;
    if (!search) return;

    const d = Number(/\bdepth (\d+)/.exec(line)?.[1] ?? 0);
    const k = Number(/\bmultipv (\d+)/.exec(line)?.[1] ?? 1);
    const cp = /\bscore cp (-?\d+)/.exec(line);
    const mate = /\bscore mate (-?\d+)/.exec(line);
    const pv = line.slice(line.indexOf(" pv ") + 4).trim().split(/\s+/);
    const sign = search.whiteToMove ? 1 : -1;

    search.lines[k - 1] = {
      score: cp ? sign * Number(cp[1]) : null,
      mate: mate ? sign * Number(mate[1]) : null,
      pv,
    };
    if (k === 1) search.depth = d;
    setResult({ lines: search.lines.filter(Boolean), depth: search.depth, isAnalyzing: true, source: "local" });
  }

  function ensureWorker(): Worker | null {
    if (workerRef.current) return workerRef.current;
    try {
      const worker = new Worker("/stockfish.js");
      worker.onmessage = (e: MessageEvent<string>) => onLine(e.data);
      worker.postMessage("uci");
      worker.postMessage(`setoption name MultiPV value ${MULTI_PV}`);
      worker.postMessage("isready");
      workerRef.current = worker;
      readyRef.current = false;
      return worker;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    return () => {
      workerRef.current?.postMessage("quit");
      workerRef.current?.terminate();
      workerRef.current = null;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    // Whatever was being searched is for a position no longer on the board.
    stopLocal();
    abortRef.current?.abort();

    if (!enabled || !fen) {
      setResult(EMPTY);
      return;
    }
    const hit = remembered(fen, depth);
    if (hit) {
      setResult({ lines: hit.lines, depth: hit.depth, source: hit.source, isAnalyzing: false });
      return;
    }
    setResult({ ...EMPTY, isAnalyzing: true });

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(async () => {
      const cloud = await cloudEval(fen, controller.signal);
      if (controller.signal.aborted) return;
      if (cloud && cloud.depth >= depth) {
        memory.set(fen, { ...cloud, target: depth });
        setResult({ ...cloud, isAnalyzing: false });
        return;
      }
      const worker = ensureWorker();
      if (!worker) {
        setResult(cloud ? { ...cloud, isAnalyzing: false } : EMPTY);
        return;
      }
      const search: Search = { fen, target: depth, capMs, whiteToMove: fen.split(" ")[1] !== "b", lines: [], depth: 0 };
      if (readyRef.current) begin(worker, search);
      else pendingRef.current = search;
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // The handlers read refs only, so the effect depends on its inputs alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, enabled, depth, capMs]);

  return result;
}
