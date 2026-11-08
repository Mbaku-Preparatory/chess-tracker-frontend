#!/usr/bin/env node
/**
 * Refreshes src/data/guessThePlayer.json, the players "Guess the player" uses.
 * Run it by hand after FIDE publishes a new monthly list, then commit the file:
 *
 *     node scripts/guess-player-pool.mjs
 *
 * The game reads only that file, so it stays fully static: no visit asks the
 * backend anything. Ratings are FIDE's classical ("standard") list.
 *
 * Who is in it:
 *  - guessable: the top 100 overall and the top 50 women, plus EXTRAS;
 *  - possible answers (`answer: true`): the top 30 overall, the top 10 women
 *    and EXTRAS, so the mystery player is someone people have heard of.
 * Nobody under 18 is in it at all: the rankings can show children, a guessing
 * game about people should not.
 * Keep the order of answers stable: the day's player is picked from it (see
 * lib/guessThePlayer.ts), so reordering changes every future day.
 */

import { writeFileSync } from "node:fs";

const GRAPHQL = process.env.GRAPHQL_URL || "https://mbaku-preparatory-production.up.railway.app/graphql/";

// Famous players the rankings leave out (inactive, or rated lower), by FIDE ID.
const EXTRAS = [
  "4100018", // Garry Kasparov
  "4101588", // Vladimir Kramnik
  "700070", // Judit Polgar
  "5000017", // Viswanathan Anand
  "2039877", // Levy Rozman (GothamChess)
  "2032562", // Eric Rosen
  "2918978", // Volen Dyulgerov (Witty Alien)
];

async function gql(query, variables) {
  const params = new URLSearchParams({ query, variables: JSON.stringify(variables) });
  const res = await fetch(`${GRAPHQL}?${params}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GraphQL answered ${res.status}`);
  const body = await res.json();
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
  return body.data;
}

const RANKINGS = `query($list: RankingCategory!, $page: Int!) {
  publicRankings(timeControl: STANDARD, category: $list, federation: "", page: $page, pageSize: 50) {
    results { rank rating birthYear player { fideId fullName slug federation title womenTitle } }
  }
}`;
const PLAYER = `query($fideId: String!) {
  publicPlayer(fideId: $fideId) { fideId fullName slug federation title womenTitle birthYear standardRating }
}`;

const ADULT_BORN_BY = new Date().getUTCFullYear() - 18;

const byId = new Map();
function add(p, answer) {
  if (!p.born || !p.rating || p.born > ADULT_BORN_BY) return;
  const seen = byId.get(p.fideId);
  if (seen) seen.answer ||= answer;
  else byId.set(p.fideId, { ...p, answer });
}

for (const [list, pages, answerUpTo] of [["OVERALL", [1, 2], 30], ["WOMEN", [1], 10]]) {
  for (const page of pages) {
    const { publicRankings } = await gql(RANKINGS, { list, page });
    for (const r of publicRankings.results) {
      add(
        {
          fideId: r.player.fideId, name: r.player.fullName, slug: r.player.slug, federation: r.player.federation,
          title: r.player.title || r.player.womenTitle || "", rating: r.rating, born: r.birthYear,
        },
        r.rank <= answerUpTo,
      );
    }
  }
}
for (const fideId of EXTRAS) {
  const { publicPlayer: p } = await gql(PLAYER, { fideId });
  if (!p) { console.warn(`not found: ${fideId}`); continue; }
  add(
    { fideId: p.fideId, name: p.fullName, slug: p.slug, federation: p.federation, title: p.title || p.womenTitle || "", rating: p.standardRating, born: p.birthYear },
    true,
  );
}

// Answers in a fixed order (by FIDE ID), so a refresh only adds or drops players.
const players = [...byId.values()].sort((a, b) => Number(a.fideId) - Number(b.fideId));
const out = { updated: new Date().toISOString().slice(0, 10), players };
writeFileSync(new URL("../src/data/guessThePlayer.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(`${players.length} players, ${players.filter((p) => p.answer).length} possible answers`);
