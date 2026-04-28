"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StockfishResult {
  score: number | null;    // centipawns, positive = white ahead
  mate: number | null;     // moves to mate, positive = white mates
  bestMove: string | null; // UCI move e.g. "e2e4" or "e7e8q"
  depth: number;
  isAnalyzing: boolean;
  source: "lichess" | "local" | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert centipawns to white winning % (0–100) for the eval bar. */
export function cpToWhitePct(score: number | null, mate: number | null): number {
  if (mate !== null) return mate > 0 ? 97 : 3;
  if (score === null) return 50;
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

// ── Session-level eval cache ──────────────────────────────────────────────────
// Shared across all hook instances so navigating back to a visited position
// returns instantly without re-querying Lichess or re-running the engine.

interface CachedEval {
  score: number | null;
  mate: number | null;
  bestMove: string | null;
  depth: number;
  source: "lichess" | "local";
}

const evalCache = new Map<string, CachedEval>();

// ── Lichess cloud eval ────────────────────────────────────────────────────────

async function fetchLichessEval(fen: string): Promise<CachedEval | null> {
  try {
    const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=1`;
    const resp = await fetch(url, { headers: { Accept: "application/json" } });
    if (!resp.ok) return null; // 404 = position not in Lichess cloud DB
    const data = await resp.json();
    const pv = data.pvs?.[0];
    if (!pv) return null;
    const bestMove = (pv.moves as string | undefined)?.split(" ")[0] ?? null;
    return {
      score:    typeof pv.cp   === "number" ? pv.cp   : null,
      mate:     typeof pv.mate === "number" ? pv.mate : null,
      bestMove,
      depth:    data.depth ?? 0,
      source:   "lichess",
    };
  } catch {
    return null;
  }
}

// ── Local WASM Stockfish ──────────────────────────────────────────────────────

const ANALYSIS_MOVETIME_MS = 1000;

function createWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  try {
    return new Worker("/stockfish.js");
  } catch {
    return null;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 80;

export function useStockfish(fen: string, enabled = true): StockfishResult {
  const [result, setResult] = useState<StockfishResult>({
    score: null, mate: null, bestMove: null, depth: 0,
    isAnalyzing: false, source: null,
  });

  const workerRef   = useRef<Worker | null>(null);
  const readyRef    = useRef(false);
  const pendingRef  = useRef<string | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  // Initialise the WASM Worker lazily — only when Lichess misses.
  function ensureWorker(): Worker | null {
    if (workerRef.current) return workerRef.current;
    const worker = createWorker();
    if (!worker) return null;
    workerRef.current = worker;
    readyRef.current  = false;

    worker.onmessage = (e: MessageEvent<string>) => {
      const line = e.data;

      if (line === "readyok") {
        readyRef.current = true;
        if (pendingRef.current) {
          sendToWorker(worker, pendingRef.current);
          pendingRef.current = null;
        }
        return;
      }

      if (line.startsWith("info") && line.includes("score")) {
        const depthM = line.match(/\bdepth (\d+)/);
        const cpM    = line.match(/\bscore cp (-?\d+)/);
        const mateM  = line.match(/\bscore mate (-?\d+)/);
        if (!depthM) return;
        setResult((prev) => ({
          ...prev,
          depth:  parseInt(depthM[1]),
          score:  cpM  ? parseInt(cpM[1])  : (mateM ? null : prev.score),
          mate:   mateM ? parseInt(mateM[1]) : null,
          isAnalyzing: true,
          source: "local",
        }));
      }

      if (line.startsWith("bestmove")) {
        const mv = line.split(" ")[1] ?? null;
        setResult((prev) => {
          const next: StockfishResult = {
            ...prev,
            bestMove: mv && mv !== "(none)" ? mv : null,
            isAnalyzing: false,
            source: "local",
          };
          if (next.score !== null || next.mate !== null) {
            evalCache.set(prev.bestMove ?? "__last__", {
              score: next.score, mate: next.mate,
              bestMove: next.bestMove, depth: next.depth, source: "local",
            });
          }
          return next;
        });
      }
    };

    worker.postMessage("uci");
    worker.postMessage("isready");
    return worker;
  }

  function sendToWorker(worker: Worker, positionFen: string) {
    worker.postMessage("stop");
    worker.postMessage(`position fen ${positionFen}`);
    worker.postMessage(`go movetime ${ANALYSIS_MOVETIME_MS}`);
  }

  // Clean up Worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.postMessage("quit");
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Main analysis effect — runs on FEN change (debounced)
  const analyse = useCallback(async (positionFen: string) => {
    if (!enabled || !positionFen) return;

    // ① Cache hit → instant response
    const cached = evalCache.get(positionFen);
    if (cached) {
      setResult({ ...cached, isAnalyzing: false });
      return;
    }

    // Show "analyzing" immediately
    setResult((prev) => ({ ...prev, isAnalyzing: true, source: null }));

    // Cancel any in-flight Lichess request for a previous position
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // ② Try Lichess cloud eval first
    try {
      const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(positionFen)}&multiPv=1`;
      const resp = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (resp.ok) {
        const data = await resp.json();
        const pv = data.pvs?.[0];
        if (pv) {
          const bestMove = (pv.moves as string | undefined)?.split(" ")[0] ?? null;
          const entry: CachedEval = {
            score:    typeof pv.cp   === "number" ? pv.cp   : null,
            mate:     typeof pv.mate === "number" ? pv.mate : null,
            bestMove,
            depth:    data.depth ?? 0,
            source:   "lichess",
          };
          evalCache.set(positionFen, entry);
          setResult({ ...entry, isAnalyzing: false });
          return; // Lichess had it — no need for local engine
        }
      }
    } catch (err: unknown) {
      // AbortError means a newer position cancelled this — bail silently
      if (err instanceof Error && err.name === "AbortError") return;
      // Any other error → fall through to local engine
    }

    // ③ Lichess miss → run local WASM Stockfish
    const worker = ensureWorker();
    if (!worker) return;

    if (!readyRef.current) {
      pendingRef.current = positionFen;
    } else {
      sendToWorker(worker, positionFen);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    const timer = setTimeout(() => analyse(fen), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fen, analyse]);

  return result;
}
