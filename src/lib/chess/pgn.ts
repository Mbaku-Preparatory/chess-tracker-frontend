import { Chess } from "chess.js";

import { START_FEN } from "./analysisLine";
import type { ParsedMove } from "./types";

/** Every ply of a PGN with the position it produced and the note after it.
 * Starts from the PGN's own FEN when it has one (a book exercise does).
 * Empty if it will not parse. */
export function parsePgn(pgn: string): ParsedMove[] {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return [];
  }
  const replay = new Chess(chess.getHeaders().FEN || START_FEN);
  const notes = new Map(chess.getComments().map((c) => [c.fen, c.comment.trim()]));
  return chess.history({ verbose: true }).map((move) => {
    const moveNumber = replay.moveNumber();
    replay.move(move.san);
    const fen = replay.fen();
    const comment = notes.get(fen);
    return {
      san: move.san,
      fen,
      // Recorded here rather than re-derived: highlighting the last move used
      // to re-parse the whole PGN on every render to find these.
      from: move.from,
      to: move.to,
      moveNumber,
      color: move.color,
      ...(comment ? { comment } : {}),
    };
  });
}

/** Where a PGN starts, and the note before its first move. */
export function pgnStart(pgn: string): { fen: string; comment: string | null } {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return { fen: START_FEN, comment: null };
  }
  const fen = chess.getHeaders().FEN || START_FEN;
  const comment = chess.getComments().find((c) => c.fen === new Chess(fen).fen())?.comment.trim();
  return { fen, comment: comment || null };
}

/** The PGN's tag pairs, "?" values left out. */
export function pgnHeaders(pgn: string): Record<string, string> {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return Object.fromEntries(
      Object.entries(chess.getHeaders()).filter(([, v]) => v && v.trim() && v.trim() !== "?"),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

/** A PGN built from a game known only by its fields and movetext. */
export function buildPgn(tags: Record<string, string | number | null | undefined>, movetext: string): string {
  const lines = Object.entries(tags)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `[${k} "${String(v).replace(/"/g, "'")}"]`);
  return `${lines.join("\n")}\n\n${movetext.trim()}`;
}

/** "1. e4 e5 2. Nf3", for links that take bare moves (Lichess's analysis URL). */
export function movetext(moves: ParsedMove[]): string {
  return moves
    .map((m, i) => (m.color === "w" ? `${m.moveNumber}. ${m.san}` : i === 0 ? `${m.moveNumber}... ${m.san}` : m.san))
    .join(" ");
}

export function pgnFilename(white: string, black: string, when: string | number | null, result: string): string {
  const clean = (s: string) => s.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return `${clean(white)}_vs_${clean(black)}_${when ?? "unknown"}_${result.replace("/", "-")}.pgn`;
}
