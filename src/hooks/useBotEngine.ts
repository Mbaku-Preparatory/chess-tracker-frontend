"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Stockfish playing at a chosen strength, for the bot once it is out of the
 * player's games. It runs in the browser (public/stockfish.js), like the
 * analysis engine, so a game costs our servers nothing.
 *
 * Strength is Stockfish's own UCI_LimitStrength + UCI_Elo. Its scale is
 * calibrated against engines, not FIDE players, and it stops at ELO_MIN:
 * below that there is no weaker setting.
 */
export const ELO_MIN = 1320;
export const ELO_MAX = 3190;

const THINK_MS = 800;

export function useBotEngine() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<((uci: string | null) => void) | null>(null);
  // A stopped search still answers with a bestmove; it belongs to nobody.
  const staleRef = useRef(0);

  const worker = useCallback((): Worker | null => {
    if (workerRef.current) return workerRef.current;
    try {
      const w = new Worker("/stockfish.js");
      w.onmessage = (e: MessageEvent<string>) => {
        const line = e.data;
        if (typeof line !== "string" || !line.startsWith("bestmove")) return;
        if (staleRef.current > 0) {
          staleRef.current -= 1;
          return;
        }
        const resolve = pendingRef.current;
        pendingRef.current = null;
        const uci = line.split(" ")[1];
        resolve?.(uci && uci !== "(none)" ? uci : null);
      };
      w.postMessage("uci");
      w.postMessage("setoption name UCI_LimitStrength value true");
      w.postMessage("isready");
      workerRef.current = w;
      return w;
    } catch {
      return null;
    }
  }, []);

  /** Drop the search in progress, if any. Its promise never settles: null
   * means "the engine has no move", which a cancelled search does not. */
  const cancel = useCallback(() => {
    if (pendingRef.current && workerRef.current) {
      workerRef.current.postMessage("stop");
      staleRef.current += 1;
    }
    pendingRef.current = null;
  }, []);

  /** The engine's move at `elo` as UCI ("e2e4"), or null if it has none. */
  const bestMove = useCallback(
    (fen: string, elo: number): Promise<string | null> => {
      cancel();
      const w = worker();
      if (!w) return Promise.resolve(null);
      return new Promise((resolve) => {
        pendingRef.current = resolve;
        const clamped = Math.min(ELO_MAX, Math.max(ELO_MIN, Math.round(elo)));
        w.postMessage(`setoption name UCI_Elo value ${clamped}`);
        w.postMessage(`position fen ${fen}`);
        w.postMessage(`go movetime ${THINK_MS}`);
      });
    },
    [cancel, worker],
  );

  useEffect(() => {
    return () => {
      workerRef.current?.postMessage("quit");
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return { bestMove, cancel };
}
