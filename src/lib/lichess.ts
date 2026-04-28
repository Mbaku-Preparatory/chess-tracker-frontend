// Lichess Broadcast API — no auth required, CORS-enabled

export interface LichessTour {
  id: string;
  name: string;
  slug: string;
  url: string;
  tier?: number;
  dates?: [number, number]; // [start, end] ms timestamps
  image?: string;
  info?: {
    format?: string;
    tc?: string;
    location?: string;
    players?: string;
  };
}

export interface LichessRound {
  id: string;
  name: string;
  slug: string;
  url: string;
  startsAt?: number;
  ongoing?: boolean;
  finished?: boolean;
}

export interface LichessBroadcastEntry {
  tour: LichessTour;
  round: LichessRound; // latest/current round
}

export interface LichessBroadcastDetail {
  tour: LichessTour;
  rounds: LichessRound[];
  defaultRoundId?: string;
}

// ── Tier label ────────────────────────────────────────────────────────────────

export function tierLabel(tier?: number): string {
  if (!tier) return "";
  if (tier >= 5) return "Elite";
  if (tier >= 4) return "Major";
  if (tier >= 3) return "Open";
  return "";
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function formatBroadcastDate(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatBroadcastRange(dates?: [number, number]): string {
  if (!dates) return "";
  const [start, end] = dates;
  const s = new Date(start).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const e = new Date(end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${s} – ${e}`;
}

// ── API fetchers ──────────────────────────────────────────────────────────────

const BASE = "https://lichess.org";

export async function fetchTopBroadcasts(nb = 30): Promise<LichessBroadcastEntry[]> {
  const resp = await fetch(`${BASE}/api/broadcast/top?nb=${nb}`, {
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error("Failed to fetch broadcasts");
  const data = await resp.json();

  const now = Date.now();

  // Filter out upcoming broadcasts whose current round hasn't started yet.
  // Lichess marks scheduled-but-not-started tournaments as "active" — we
  // only want ones that are live right now or have already begun.
  const active: LichessBroadcastEntry[] = (data.active ?? []).filter(
    (e: LichessBroadcastEntry) =>
      e.round.ongoing === true ||
      (e.round.startsAt !== undefined && e.round.startsAt <= now)
  );

  const past: LichessBroadcastEntry[] = data.past?.results ?? [];

  // Past first (always have games), then active that have started
  return [...past, ...active].slice(0, nb);
}

export async function fetchBroadcastDetail(tourId: string): Promise<LichessBroadcastDetail> {
  const resp = await fetch(`${BASE}/api/broadcast/${tourId}`, {
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error("Failed to fetch broadcast detail");
  return resp.json();
}

export async function fetchRoundPgn(roundUrl: string): Promise<string> {
  const url = roundUrl.replace(/\/$/, "") + ".pgn";
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Failed to fetch round PGN");
  return resp.text();
}

// ── Multi-game PGN splitter ───────────────────────────────────────────────────

export interface ParsedBroadcastGame {
  white: string;
  black: string;
  whiteElo: number | null;
  blackElo: number | null;
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
  eco: string;
  openingName: string;
  event: string;
  date: string;
  moves: string;
}

function header(pgn: string, name: string): string {
  const m = pgn.match(new RegExp(`\\[${name} "([^"]*)"`));
  return m?.[1] ?? "";
}

export function splitPgn(pgn: string): ParsedBroadcastGame[] {
  // Split on a blank line followed by '[' to get individual game blocks
  const blocks = pgn.split(/\n\n(?=\[)/).map((b) => b.trim()).filter(Boolean);
  const games: ParsedBroadcastGame[] = [];

  for (const block of blocks) {
    const white = header(block, "White");
    const black = header(block, "Black");
    if (!white && !black) continue;

    const resultStr = header(block, "Result");
    const validResults = ["1-0", "0-1", "1/2-1/2", "*"];
    const result = (validResults.includes(resultStr) ? resultStr : "*") as ParsedBroadcastGame["result"];

    // Moves come after the last header line (double newline separates headers from moves)
    const movesMatch = block.match(/\]\s*\n\s*\n([\s\S]+)$/);
    const moves = movesMatch?.[1]?.trim() ?? "";

    games.push({
      white,
      black,
      whiteElo: parseInt(header(block, "WhiteElo")) || null,
      blackElo: parseInt(header(block, "BlackElo")) || null,
      result,
      eco:         header(block, "ECO"),
      openingName: header(block, "Opening"),
      event:       header(block, "BroadcastName") || header(block, "Event"),
      date:        header(block, "Date"),
      moves,
    });
  }

  return games;
}
