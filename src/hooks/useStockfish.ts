"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StockfishResult {
  score: number | null;    // centipawns, positive = white ahead
  mate: number | null;     // moves to mate, positive = white mates
  bestMove: string | null; // UCI move e.g. "e2e4" or "e7e8q"
  depth: number;
  isAnalyzing: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert centipawns to white winning % (0–100) for the eval bar. */
export function cpToWhitePct(score: number | null, mate: number | null): number {
  if (mate !== null) return mate > 0 ? 97 : 3;
  if (score === null) return 50;
  // Sigmoid used by Lichess
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * score)) - 1);
}

/** Format score for display: "+1.3", "-0.5", "M3", "M-7" */
export function formatScore(score: number | null, mate: number | null): string {
  if (mate !== null) return mate > 0 ? `M${mate}` : `M${mate}`;
  if (score === null) return "0.00";
  const pawn = score / 100;
  return (pawn >= 0 ? "+" : "") + pawn.toFixed(2);
}

/** Parse UCI bestmove into [from, to] squares. */
export function parseUciMove(uci: string | null): [string, string] | null {
  if (!uci || uci.length < 4 || uci === "(none)") return null;
  return [uci.slice(0, 2), uci.slice(2, 4)];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const ANALYSIS_MOVETIME_MS = 800; // analyse for 800 ms then return best result
const DEBOUNCE_MS = 50;           // short pause before sending position after navigation

export function useStockfish(fen: string, enabled = true): StockfishResult {
  const [result, setResult] = useState<StockfishResult>({
    score: null, mate: null, bestMove: null, depth: 0, isAnalyzing: false,
  });

  const workerRef = useRef<Worker | null>(null);
  const readyRef = useRef(false);
  const pendingFenRef = useRef<string | null>(null);

  function sendPosition(worker: Worker, positionFen: string) {
    worker.postMessage("stop");
    worker.postMessage(`position fen ${positionFen}`);
    worker.postMessage(`go movetime ${ANALYSIS_MOVETIME_MS}`);
  }

  // Initialise the Web Worker once
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let worker: Worker;
    try {
      worker = new Worker("/stockfish.js");
    } catch {
      return; // Stockfish unavailable (SSR guard)
    }

    workerRef.current = worker;
    readyRef.current = false;

    worker.onmessage = (e: MessageEvent<string>) => {
      const line: string = e.data;

      if (line === "readyok") {
        readyRef.current = true;
        // If a FEN was queued while engine was initialising, send it now
        if (pendingFenRef.current) {
          sendPosition(worker, pendingFenRef.current);
          pendingFenRef.current = null;
        }
        return;
      }

      // "info depth N score cp X ..." or "info depth N score mate X ..."
      if (line.startsWith("info") && line.includes("score")) {
        const depthMatch = line.match(/\bdepth (\d+)/);
        const cpMatch    = line.match(/\bscore cp (-?\d+)/);
        const mateMatch  = line.match(/\bscore mate (-?\d+)/);
        if (!depthMatch) return;

        setResult((prev) => ({
          ...prev,
          depth: parseInt(depthMatch[1]),
          score: cpMatch  ? parseInt(cpMatch[1])  : (mateMatch ? null : prev.score),
          mate:  mateMatch ? parseInt(mateMatch[1]) : null,
          isAnalyzing: true,
        }));
      }

      // "bestmove e2e4 ponder e7e5"
      if (line.startsWith("bestmove")) {
        const mv = line.split(" ")[1] ?? null;
        setResult((prev) => ({
          ...prev,
          bestMove: mv && mv !== "(none)" ? mv : null,
          isAnalyzing: false,
        }));
      }
    };

    worker.postMessage("uci");
    worker.postMessage("isready");

    return () => {
      worker.postMessage("quit");
      worker.terminate();
      workerRef.current = null;
      readyRef.current = false;
    };
  }, [enabled]);

  // Re-analyse whenever FEN changes (debounced)
  const analyse = useCallback((positionFen: string) => {
    const worker = workerRef.current;
    if (!worker || !positionFen || !enabled) return;

    setResult((prev) => ({ ...prev, isAnalyzing: true, bestMove: null, depth: 0 }));

    if (!readyRef.current) {
      pendingFenRef.current = positionFen;
      return;
    }

    sendPosition(worker, positionFen);
  }, [enabled]);

  useEffect(() => {
    const timer = setTimeout(() => analyse(fen), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fen, analyse]);

  return result;
}
