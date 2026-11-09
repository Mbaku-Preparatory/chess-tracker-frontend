#!/usr/bin/env node
/**
 * Picks "their game" for Guess the player: one game each possible answer won,
 * shown on the board as an extra clue (src/data/guessThePlayerGames.json).
 * Run it after scripts/guess-player-pool.mjs, then commit both files:
 *
 *     node scripts/guess-player-games.mjs
 *
 * It only fills gaps. A player who already has a game keeps it (so a day's
 * game never changes under someone), and players who are no longer possible
 * answers are dropped. It prints the answers still without a game: those days
 * simply have no board until one is added by hand.
 *
 * Where the games come from, and the rules for each:
 *  - Lichess broadcasts (the EVENTS below), CC BY-SA 4.0. The credit under the
 *    board says so the whole time, and the game's own page is linked once the
 *    puzzle is over. Picked here: the player's win in the most important event,
 *    then against the strongest opponent; 25 to 100 moves, a normal start.
 *  - Added by hand, for players these events miss: retired legends (famous
 *    games from before Lichess broadcasts, whose moves are public record) and
 *    the streamers (one of their own online wins: Lichess games are CC0,
 *    Chess.com credited and linked). Never type a game from memory: copy it
 *    from a source and let this script check that it plays.
 *
 * Every game in the file, hand-added or not, is replayed with chess.js before
 * it is written, so a bad move fails here, not on the page.
 *
 * Downloads are cached in $GAMES_CACHE (default: the system temp folder), so
 * a rerun only fetches events it has not seen. Lichess allows one download at
 * a time; on a 429 the script waits and tries again.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Chess } from "chess.js";

const POOL = "src/data/guessThePlayer.json";
const OUT = "src/data/guessThePlayerGames.json";
const CACHE = process.env.GAMES_CACHE || join(tmpdir(), "guess-player-games");
const UA = { "User-Agent": "chesspreparatory.com guess-the-player games script" };

const CREDIT = "Game from a Lichess broadcast, CC BY-SA 4.0";
const MIN_PLIES = 50;
const MAX_PLIES = 200;
// A clock that starts below this is not a classical game. Broadcasts carry
// armageddons (Norway Chess) and rapid tiebreaks (the World Cup) in the same
// rounds as the classical games, and the TimeControl tag is free text, often
// missing, so the clock is the reliable sign.
const MIN_SECONDS = 45 * 60;

// Classical Lichess broadcasts and how much a win in each counts:
// 10 a world title match, 9 a Candidates, 7 an Olympiad or a top
// round robin, 6 the women's series, 5 other strong events.
const EVENTS = [
  ["n3yHJI5Y", 10, "FIDE World Championship 2024"],
  ["kAvAGI7N", 9, "FIDE Candidates Tournament 2022"],
  ["yKJVHd3P", 9, "FIDE Women's Candidates Tournament - Pool A"],
  ["Zi6vxpWY", 9, "FIDE Women's Candidates Tournament - Pool B"],
  ["qzRz5JQa", 9, "Women's Candidates Finals"],
  ["2adDCe7c", 9, "FIDE Women's World Championship"],
  ["wEuVhT9c", 9, "FIDE Candidates 2024 | Open"],
  ["PqLAYX1D", 9, "FIDE Candidates 2024 | Women"],
  ["xj4qM8Nw", 9, "FIDE Candidates 2026: Women"],
  ["BLA70Vds", 9, "FIDE Candidates 2026: Open"],
  ["fRxmNNiW", 7, "FIDE Chess.com Grand Swiss 2021"],
  ["YIJYOtTy", 7, "FIDE Chess.com Women's Grand Swiss 2021"],
  ["IsMvGXWN", 7, "Tata Steel Masters 2022"],
  ["d1RmKCil", 7, "2022 Superbet Chess Classic Romania"],
  ["KeMXJB4g", 7, "2022 Norway Chess"],
  ["41uXOrqR", 7, "44th Chess Olympiad 2022 | Open | Boards 1-40"],
  ["evAN0x2E", 7, "44th Chess Olympiad 2022 | Women | Boards 1-128"],
  ["7XjcrjaG", 7, "Sinquefield Cup | Grand Chess Tour 2022"],
  ["1YsJS3PW", 7, "Tata Steel Masters 2023"],
  ["Mo5rqokT", 7, "Superbet Chess Classic Romania (1/5)"],
  ["eHDUE77y", 7, "Norway Chess 2023"],
  ["l40HBYGJ", 7, "FIDE World Cup 2023 Open Section"],
  ["KoYKUfEm", 7, "FIDE World Cup 2023 Women's Section"],
  ["4iQF8XHP", 7, "FIDE Grand Swiss 2023"],
  ["iSgc00KJ", 7, "FIDE Women's Grand Swiss 2023"],
  ["ycy5D2r8", 7, "Tata Steel Masters 2024"],
  ["qkY2yAcs", 7, "Norway Chess 2024 | Open"],
  ["5LW5RS0a", 7, "Norway Chess 2024 | Women"],
  ["K1NfeoWE", 7, "Superbet Romania Chess Classic 2024"],
  ["SjZWjkng", 7, "45th Chess Olympiad Budapest 2024 | Women I"],
  ["M5YHvpOX", 7, "45th Chess Olympiad Budapest 2024 | Open II"],
  ["aZ8unZw3", 7, "45th Chess Olympiad Budapest 2024 | Women II"],
  ["q6ezoCXP", 7, "45th Chess Olympiad Budapest 2024 | Open III"],
  ["jCcYzv6v", 7, "45th Chess Olympiad Budapest 2024 | Open IV"],
  ["9SgOOjEo", 7, "45th Chess Olympiad Budapest 2024 | Women III"],
  ["b1XsWkeS", 7, "45th Chess Olympiad Budapest 2024 | Women IV"],
  ["jR0BiOwR", 7, "Tata Steel Chess 2025 | Masters"],
  ["xPpw1xOU", 7, "GCT: 2025 Superbet Classic Romania"],
  ["PcsMbQ9J", 7, "Norway Chess 2025 | Open"],
  ["lrKI0bSz", 7, "Norway Chess 2025 | Women"],
  ["1Nrsz7yB", 7, "FIDE Women's World Cup 2025 | Round 1"],
  ["VO98xVVA", 7, "FIDE Women's World Cup 2025 | Round 2"],
  ["PvJr6nSP", 7, "FIDE Women's World Cup 2025 | Round 3"],
  ["wC1tDyqU", 7, "FIDE Women's World Cup 2025 | Round 4"],
  ["ckxYpvoV", 7, "FIDE Women's World Cup 2025 | Quarterfinals"],
  ["D8vMwkm8", 7, "FIDE Women's World Cup 2025 | Semifinals"],
  ["OX9co2G6", 7, "FIDE Women's World Cup 2025 | Finals"],
  ["09ZG4Ez5", 7, "GCT: Sinquefield Cup 2025 | Sinquefield Cup"],
  ["vSyxclHS", 7, "FIDE Grand Swiss 2025 | Open"],
  ["NPYDsod4", 7, "FIDE Grand Swiss 2025 | Women"],
  ["CBWLKDSY", 7, "FIDE World Cup 2025 | Round 1"],
  ["C8xGMEpX", 7, "FIDE World Cup 2025 | Round 2"],
  ["sOK6GBCf", 7, "FIDE World Cup 2025 | Round 3"],
  ["xLyRWYPA", 7, "FIDE World Cup 2025 | Round 4"],
  ["zb9ruNEJ", 7, "FIDE World Cup 2025 | Round 5"],
  ["4Zfj97D4", 7, "FIDE World Cup 2025 | Quarterfinals"],
  ["25zoKzpI", 7, "FIDE World Cup 2025 | Semifinals"],
  ["DqmmnYSq", 7, "FIDE World Cup 2025 | Finals"],
  ["3COxSfdj", 7, "Tata Steel Chess 2026 | Masters"],
  ["kDQUxYbE", 7, "Norway Chess 2026 | Open"],
  ["NjcX8cBn", 7, "Norway Chess 2026 | Women"],
  ["2sMqschv", 7, "GCT: Sinquefield Cup 2026"],
  ["HtMn014k", 7, "46th FIDE Chess Olympiad Samarkand 2026 | Women | Matches 1-25"],
  ["n1pPI5Q0", 7, "46th FIDE Chess Olympiad Samarkand 2026 | Open | Matches 1-12"],
  ["p2Kbxke9", 6, "FIDE Women's Grand Prix (4/4)"],
  ["YVhP7H3j", 6, "Cairns Cup 2023"],
  ["TQDXwWif", 6, "FIDE Women's Grand Prix 2024/25 | Tbilisi"],
  ["DMfrG9HP", 6, "FIDE Women's Grand Prix 2024/25 | Shymkent"],
  ["0ln3zyv9", 6, "FIDE Women's Grand Prix 2024/25 | Monaco"],
  ["iKyh0heF", 6, "FIDE Women's Grand Prix 2024/25 | Nicosia"],
  ["kTMK4u1P", 6, "FIDE Women's Grand Prix 2024/25 | Pune"],
  ["0eZnPsBD", 6, "FIDE Women's Grand Prix 2024/25 | Austria"],
  ["MFr6IhpK", 6, "2025 Cairns Cup"],
  ["Xkh8XaIP", 6, "2026 Cairns Cup"],
  ["Tsqy2Axh", 5, "Dutch Championship 2021 | Knockout Stage"],
  ["tsKNecXm", 5, "European Individual Chess Championship"],
  ["1yw9kQej", 5, "Sharjah Masters 2022"],
  ["GmLBMTOI", 5, "Dutch Championship 2022 | Groningen"],
  ["i8enfuSJ", 5, "2023 TePe Sigeman & Co"],
  ["eiGRBLxi", 5, "Sharjah Masters 2023"],
  ["bYj3EbIu", 5, "Dutch Championships | Open"],
  ["3jFal3DL", 5, "Qatar Masters 2023"],
  ["WOjekfYH", 5, "European Team Championship | Open"],
  ["q4fmAWhu", 5, "European Team Championship | Women"],
  ["R2SveyWi", 5, "2023 London Chess Classic"],
  ["FdThOEmM", 5, "TePe Sigeman & Co Chess Tournament 2024"],
  ["7SK1f1Jg", 5, "Sharjah | Masters"],
  ["08jxYNb7", 5, "Dutch Championship 2024 | Women"],
  ["a4gBsu31", 5, "Dutch Championship 2024 | Open"],
  ["XVSoqWMI", 5, "57th International Chess Festival Biel | Masters Final"],
  ["NW5YDA3r", 5, "European Individual Chess Championship 2024 | Boards 1-64"],
  ["DZqK6BFN", 5, "2024 London Chess Classic | Elite"],
  ["GYz1m7IG", 5, "Sharjah Masters 2025 | Group A"],
  ["9dpbp7ox", 5, "TePe Sigeman & Co Chess Tournament 2025"],
  ["ISdmqct3", 5, "Dutch Championships 2025 | Open | First stage"],
  ["PGFBkEha", 5, "Dutch Championships 2025 | Women | First stage"],
  ["xfLp6UlH", 5, "Dutch Championships 2025 | Women | Quarterfinals"],
  ["Zi12QchK", 5, "Dutch Championships 2025 | Open | Quarterfinals"],
  ["8QkKzmS0", 5, "Dutch Championships 2025 | Women | Semifinals"],
  ["OH1XajiM", 5, "Dutch Championships 2025 | Open | Semifinals"],
  ["DRq1AjiQ", 5, "Dutch Championships 2025 | Women | Finals"],
  ["C4A0xAP8", 5, "Dutch Championships 2025 | Open | Finals"],
  ["UdNNxH5Q", 5, "58th International Chess Festival Biel | Masters Final"],
  ["qG1Psy8y", 5, "European Team Chess Championship 2025 | Open"],
  ["xDIlkiVh", 5, "European Team Chess Championship 2025 | Women"],
  ["VGXtuWXw", 5, "2025 London Chess Classic | Elite"],
  ["JWIgkNkS", 5, "European Individual Chess Championship 2026 | Boards 1-66"],
  ["1X75mYa7", 5, "TePe Sigeman & Co Chess Tournament 2026"],
  ["weYdpnGl", 5, "Dutch Championship 2026 Open"],
  ["U0wxHN7I", 5, "Dutch Championship 2026 Women"],
  ["HevfAJPg", 5, "59th Biel International Chess Festival 2026 | Triathlon | Masters Final"],
  ["wfW8ajMV", 5, "2026 Chinese Chess League Division A | Round-Robin | R7-11"],
  ["5SV1K3bP", 5, "Nanhu ICBC Cup GM Match 2025: Zhu Jiner vs Dmitry Andreikin"],
  ["Jraq5ar5", 5, "75th Russian Championship"],
  ["yAD0CDY6", 5, "74th Russian Championship"]
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function eventPgn(id) {
  const file = join(CACHE, `${id}.pgn`);
  if (existsSync(file)) return readFileSync(file, "utf8");
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(`https://lichess.org/api/broadcast/${id}.pgn`, { headers: UA });
    if (res.ok) {
      const text = await res.text();
      writeFileSync(file, text);
      await sleep(1000);
      return text;
    }
    console.warn(`  ${id}: HTTP ${res.status}, waiting`);
    await sleep(attempt * 20_000);
  }
  throw new Error(`Could not download broadcast ${id}`);
}

function parseGames(pgn) {
  return pgn
    .split(/\n\s*\n(?=\[Event )/)
    .map((chunk) => {
      const headers = Object.fromEntries([...chunk.matchAll(/^\[(\w+) "([^"]*)"\]$/gm)].map((m) => [m[1], m[2]]));
      let body = chunk.replace(/^\[.*\]$/gm, "").replace(/\{[^}]*\}/g, " ");
      // Side lines, innermost first: they can nest.
      while (/\([^()]*\)/.test(body)) body = body.replace(/\([^()]*\)/g, " ");
      const sans = body
        .replace(/\$\d+/g, " ")
        .replace(/\d+\.(\.\.)?/g, " ")
        .split(/\s+/)
        .filter((t) => t && !["1-0", "0-1", "1/2-1/2", "*"].includes(t));
      return { headers, sans, clock: firstClock(chunk) };
    })
    .filter((g) => g.headers.White);
}

/** "Duda Jan-Krzysztof (POL)" -> "Duda Jan-Krzysztof": the federation is a clue the tiles give. */
const cleanName = (name) => name.replace(/\s*\([A-Z]{3}\)$/, "");

/** The first clock reading in the moves, in seconds; Infinity when the game has no clock comments. */
function firstClock(chunk) {
  const m = /\[%clk (\d+):(\d+):(\d+)/.exec(chunk);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : Infinity;
}

/** The moves as clean SAN, or null if they do not play from the normal start. */
function play(sans) {
  const chess = new Chess();
  try {
    for (const san of sans) chess.move(san);
  } catch {
    return null;
  }
  return chess.history().join(" ");
}

const pool = JSON.parse(readFileSync(POOL, "utf8"));
const answers = pool.players.filter((p) => p.answer);
const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")).games : {};

const games = {};
for (const p of answers) if (old[p.fideId]) games[p.fideId] = old[p.fideId];
const missing = new Set(answers.filter((p) => !games[p.fideId]).map((p) => p.fideId));

// Older broadcasts (2022 Norway Chess, for one) have no FideId tags: then the
// name decides, as "Anand, Viswanathan" or "Viswanathan Anand".
const fold = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
const byName = new Map(answers.map((p) => [fold(p.name), p.fideId]));
const fideIdOf = (id, name) => id || byName.get(fold(cleanName(name || ""))) || "";

if (missing.size) {
  mkdirSync(CACHE, { recursive: true });
  const best = new Map();
  for (const [id, weight, name] of EVENTS) {
    console.log(`${name}`);
    for (const { headers: h, sans, clock } of parseGames(await eventPgn(id))) {
      if (h.FEN || h.SetUp === "1" || (h.Variant && h.Variant !== "Standard")) continue;
      const winner = h.Result === "1-0" ? "white" : h.Result === "0-1" ? "black" : null;
      if (!winner) continue;
      const fideId = winner === "white" ? fideIdOf(h.WhiteFideId, h.White) : fideIdOf(h.BlackFideId, h.Black);
      if (!missing.has(fideId) || sans.length < MIN_PLIES || sans.length > MAX_PLIES) continue;
      if (clock < MIN_SECONDS) continue;
      const opponentElo = Number(winner === "white" ? h.BlackElo : h.WhiteElo) || 0;
      const score = weight * 10_000 + opponentElo;
      // On a tie the later game wins: a match or a tournament is remembered for how it ended.
      const current = best.get(fideId);
      if (current && current.score > score) continue;
      const moves = play(sans);
      if (!moves) continue;
      best.set(fideId, {
        score,
        game: {
          side: winner,
          white: cleanName(h.White),
          black: cleanName(h.Black),
          result: h.Result,
          // Some tags say only "Men" or "Open": then the broadcast's own name.
          event: h.Event && h.Event.length >= 12 ? h.Event : name.split(" | ")[0],
          date: [h.Date, h.UTCDate].find((d) => /^\d{4}\./.test(d || "")) || "",
          moves,
          credit: CREDIT,
          url: h.GameURL || h.Site,
        },
      });
    }
  }
  for (const [fideId, { game }] of best) games[fideId] = game;
}

// Every game must play, hand-added ones included.
for (const [fideId, game] of Object.entries(games)) {
  const moves = play(game.moves.split(" "));
  if (!moves) throw new Error(`The game for ${fideId} does not play from the starting position`);
  games[fideId] = { ...game, moves };
}

const ordered = Object.fromEntries(answers.filter((p) => games[p.fideId]).map((p) => [p.fideId, games[p.fideId]]));
writeFileSync(OUT, `${JSON.stringify({ updated: new Date().toISOString().slice(0, 10), games: ordered }, null, 1)}\n`);

const without = answers.filter((p) => !ordered[p.fideId]);
console.log(`\n${Object.keys(ordered).length} of ${answers.length} answers have a game.`);
if (without.length) console.log(`No game yet (add one by hand): ${without.map((p) => `${p.name} (${p.fideId})`).join(", ")}`);
