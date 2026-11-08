/**
 * Guess the player: one mystery FIDE player a day, eight guesses, a coloured
 * hint per clue after each guess.
 *
 * Everything is in the browser. The players are a file in the repo
 * (src/data/guessThePlayer.json, refreshed monthly by
 * scripts/guess-player-pool.mjs), the day's answer is worked out from the
 * date, and progress lives in localStorage. No visit asks the backend anything.
 */

import pool from "@/data/guessThePlayer.json";

export type PoolPlayer = {
  fideId: string;
  name: string;
  slug: string;
  federation: string;
  title: string;
  rating: number;
  born: number;
  answer: boolean;
};

export const PLAYERS = pool.players as PoolPlayer[];
export const POOL_UPDATED = pool.updated;
const BY_ID = new Map(PLAYERS.map((p) => [p.fideId, p]));
export const playerById = (fideId: string) => BY_ID.get(fideId);

export const MAX_GUESSES = 8;
/** How close a rating or a birth year must be for a yellow. */
export const RATING_CLOSE = 50;
export const BORN_CLOSE = 3;

// ── The day ────────────────────────────────────────────────────────────────

/** Puzzle #1's date. Each local calendar day after it is the next puzzle, as in any daily word game. */
const FIRST_DAY = Date.UTC(2026, 10, 9);
const DAY_MS = 86_400_000;

export function puzzleNumber(now = new Date()): number {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(1, Math.floor((today - FIRST_DAY) / DAY_MS) + 1);
}

/** Milliseconds to the next local midnight, when the next player appears. */
export function msUntilNextPuzzle(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

// A fixed shuffle of the possible answers, so consecutive days are not
// neighbours in the list. Fixed seed: the same order for everyone, every visit.
function shuffled<T>(items: T[], seed: number): T[] {
  let s = seed >>> 0;
  const rand = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const ANSWERS = shuffled(
  PLAYERS.filter((p) => p.answer),
  20261109,
);

export function answerFor(puzzle: number): PoolPlayer {
  return ANSWERS[(puzzle - 1) % ANSWERS.length];
}

// ── Clues ──────────────────────────────────────────────────────────────────

/**
 * FIDE's continents: the continental federation each member belongs to
 * (European Chess Union, Asian Chess Federation, the Americas, Africa,
 * Oceania), which is why Armenia, Azerbaijan, Georgia, Israel and Turkey are
 * Europe here. A federation missing from the list just never gets a yellow.
 */
const CONTINENT: Record<string, string> = {};
const add = (continent: string, codes: string) => codes.split(" ").forEach((c) => (CONTINENT[c] = continent));
add("Europe", "ALB AND ARM AUT AZE BEL BIH BLR BUL CRO CYP CZE DEN ENG ESP EST FAI FIN FRA GEO GER GRE HUN IRL ISL ISR ITA KOS LAT LIE LTU LUX MDA MKD MLT MNC MNE NED NOR POL POR ROU RUS SCO SLO SMR SRB SUI SVK SWE TUR UKR WLS");
add("Asia", "AFG BAN BRN CHN HKG INA IND IRI IRQ JOR JPN KAZ KGZ KOR KSA KUW LBN MAC MAS MGL MYA NEP OMA PAK PHI PLE QAT SGP SRI SYR THA TJK TKM TPE UAE UZB VIE YEM");
add("Americas", "ARG BAR BOL BRA CAN CHI COL CRC CUB DOM ECU ESA GUA HON JAM MEX NCA PAN PAR PER PUR TTO URU USA VEN");
add("Africa", "ALG ANG BOT CMR EGY ETH GHA KEN LBA MAR MAW MOZ NAM NGR RSA RWA SEN SUD TAN TUN UGA ZAM ZIM");
add("Oceania", "AUS FIJ NZL PNG");

export function continentOf(federation: string): string | undefined {
  return CONTINENT[federation];
}

export type Mark = "hit" | "close" | "miss";
/** For numbers: which way the mystery player's value lies from the guess's. */
export type Direction = "up" | "down" | null;

export type Clue = { mark: Mark; direction: Direction };
export type Feedback = { federation: Clue; title: Clue; rating: Clue; born: Clue; solved: boolean };

function numberClue(guess: number, answer: number, close: number): Clue {
  if (guess === answer) return { mark: "hit", direction: null };
  return { mark: Math.abs(guess - answer) <= close ? "close" : "miss", direction: answer > guess ? "up" : "down" };
}

export function feedbackFor(guess: PoolPlayer, answer: PoolPlayer): Feedback {
  const sameContinent = !!continentOf(guess.federation) && continentOf(guess.federation) === continentOf(answer.federation);
  return {
    federation: { mark: guess.federation === answer.federation ? "hit" : sameContinent ? "close" : "miss", direction: null },
    title: { mark: guess.title === answer.title ? "hit" : "miss", direction: null },
    rating: numberClue(guess.rating, answer.rating, RATING_CLOSE),
    born: numberClue(guess.born, answer.born, BORN_CLOSE),
    solved: guess.fideId === answer.fideId,
  };
}

// ── Search ─────────────────────────────────────────────────────────────────

/** Lowercase, accents dropped: "Polgár" is found by "polgar". */
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** What people call some players, searched along with the name on FIDE's list. */
export const ALIASES: Record<string, string> = {
  "2039877": "GothamChess",
  "2918978": "Witty Alien",
};
const FOLDED = PLAYERS.map((p) => ({ p, name: fold(ALIASES[p.fideId] ? `${p.name} ${ALIASES[p.fideId]}` : p.name) }));

/**
 * Players whose name (or alias) has every typed word. A whole word beats the
 * start of the name, which beats the start of a word, which beats a match
 * inside one: "so" finds Wesley So before Song Yuxin, "anand" Anand before
 * Praggnanandhaa. Then the higher rated first.
 */
export function searchPlayers(query: string, exclude: Set<string>, limit = 8): PoolPlayer[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const score = (name: string) => {
    const parts = name.split(/[\s-]+/);
    return words.reduce(
      (sum, w) => sum + (parts.includes(w) ? 4 : name.startsWith(w) ? 3 : parts.some((part) => part.startsWith(w)) ? 2 : 0),
      0,
    );
  };
  return FOLDED.filter(({ p, name }) => !exclude.has(p.fideId) && words.every((w) => name.includes(w)))
    .map((m) => ({ ...m, score: score(m.name) }))
    .sort((a, b) => b.score - a.score || b.p.rating - a.p.rating)
    .slice(0, limit)
    .map(({ p }) => p);
}

// ── Progress and stats (this browser only) ───────────────────────────────

const GAME_KEY = "guess-the-player:game";
const STATS_KEY = "guess-the-player:stats";

export type Game = { puzzle: number; guesses: string[] };
export type Stats = { played: number; won: number; streak: number; best: number; lastPuzzle: number; spread: number[] };

const EMPTY_STATS: Stats = { played: 0, won: 0, streak: 0, best: 0, lastPuzzle: 0, spread: Array(MAX_GUESSES).fill(0) };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: today's game still plays, it just isn't remembered.
  }
}

/** Today's game so far: a saved game from another day starts over. Unknown IDs (a pool refresh) are dropped. */
export function loadGame(puzzle: number): Game {
  const saved = read<Game>(GAME_KEY);
  if (!saved || saved.puzzle !== puzzle || !Array.isArray(saved.guesses)) return { puzzle, guesses: [] };
  return { puzzle, guesses: saved.guesses.filter((id) => BY_ID.has(id)).slice(0, MAX_GUESSES) };
}

export function saveGame(game: Game) {
  write(GAME_KEY, game);
}

export function loadStats(): Stats {
  const s = read<Stats>(STATS_KEY);
  return s && Array.isArray(s.spread) && s.spread.length === MAX_GUESSES ? s : { ...EMPTY_STATS, spread: [...EMPTY_STATS.spread] };
}

/** Count a finished game once. `tries` is how many guesses a win took; null for a loss. */
export function recordResult(puzzle: number, tries: number | null): Stats {
  const s = loadStats();
  if (s.lastPuzzle === puzzle) return s;
  const streak = tries === null ? 0 : s.lastPuzzle === puzzle - 1 ? s.streak + 1 : 1;
  const spread = [...s.spread];
  if (tries !== null) spread[tries - 1] += 1;
  const next: Stats = {
    played: s.played + 1,
    won: s.won + (tries === null ? 0 : 1),
    streak,
    best: Math.max(s.best, streak),
    lastPuzzle: puzzle,
    spread,
  };
  write(STATS_KEY, next);
  return next;
}

// ── Sharing ────────────────────────────────────────────────────────────────

const TILE: Record<Mark, string> = { hit: "🟩", close: "🟨", miss: "🟥" };

/** The result as text: one row per guess, federation / title / rating / born. Names no player, so it spoils nothing. */
export function shareText(puzzle: number, feedback: Feedback[], won: boolean): string {
  const rows = feedback.map((f) => [f.federation, f.title, f.rating, f.born].map((c) => TILE[c.mark]).join(""));
  return [`Guess the player #${puzzle} ${won ? feedback.length : "X"}/${MAX_GUESSES}`, ...rows].join("\n");
}
