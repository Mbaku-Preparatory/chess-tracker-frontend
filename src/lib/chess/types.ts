/** One ply, with the position it produced. Shared by every viewer. */
export interface ParsedMove {
  san: string;
  fen: string;
  from: string;
  to: string;
  moveNumber: number;
  color: "w" | "b";
  /** The annotator's note after this move, when the PGN has one. */
  comment?: string;
}
