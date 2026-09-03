/** "1", "0" or "½" per side. null per side when the game has no result. */
export type SideScores = Record<"white" | "black", string | null>;

export const NO_SCORES: SideScores = { white: null, black: null };

/**
 * Each side's score from a PGN-style result string.
 *
 * Shared by both game viewers because it is one rule: the result token is
 * written from the board's point of view and covers both sides at once. An
 * unfinished game ("*") or a missing tag scores nothing rather than guessing.
 *
 * A Game record's own `result` is stored relative to the player being scouted,
 * so it is not this — see scoresFromPlayerResult.
 */
export function scoresFromResultTag(tag: string | null | undefined): SideScores | null {
  switch (tag) {
    case "1-0":
      return { white: "1", black: "0" };
    case "0-1":
      return { white: "0", black: "1" };
    case "1/2-1/2":
      return { white: "½", black: "½" };
    default:
      return null;
  }
}

/**
 * Each side's score from a Game record's win/draw/loss, which is recorded
 * relative to the player being scouted and so needs their colour to read.
 */
export function scoresFromPlayerResult(
  result: string,
  playerColor: "white" | "black",
): SideScores {
  const other = playerColor === "white" ? "black" : "white";
  const pair: Record<string, [string, string]> = {
    win: ["1", "0"],
    loss: ["0", "1"],
    draw: ["½", "½"],
  };
  const found = pair[result];
  if (!found) return NO_SCORES;
  return { [playerColor]: found[0], [other]: found[1] } as SideScores;
}
