// Lists the English the site shows through <T>, t(), t.plural() and msg()
// that a translation file in public/locales/ lacks, and translations whose
// English is gone (reworded or deleted). See src/lib/i18n.ts.
//
//   pnpm i18n:check              report, exit 1 if anything is missing
//   pnpm i18n:check --missing    print the missing English as JSON, to translate
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ENTITIES = { "&apos;": "'", "&quot;": '"', "&amp;": "&", "&nbsp;": " ", "&lt;": "<", "&gt;": ">" };
const STR = String.raw`"(?:[^"\\]|\\.)*"`;

// React's rule for text written between tags: each line trimmed, blank lines
// dropped, the rest joined with one space; then entities decoded.
const jsxText = (raw) =>
  raw.split("\n").map((l) => l.trim()).filter(Boolean).join(" ").replace(/&\w+;/g, (e) => ENTITIES[e] ?? e);

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

const keys = new Map(); // English -> { plural, where }
const add = (text, where, plural = false) => {
  const seen = keys.get(text);
  keys.set(text, { plural: plural || seen?.plural === true, where: seen?.where ?? where });
};

for (const file of files(join(ROOT, "src"))) {
  // Comments out, so the examples in them are not taken for text the site shows.
  const src = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const where = file.slice(ROOT.length);
  // <T attr="…" attr={…}>text</T>: one= makes it a count, keyed by the text (the "other" form).
  const ATTR = String.raw`\s+\w+=(?:"[^"]*"|\{(?:[^{}]|\{[^{}]*\})*\})`;
  for (const m of src.matchAll(new RegExp(String.raw`<T((?:${ATTR})*)\s*>([\s\S]*?)<\/T>`, "g"))) {
    const plural = /\sone=/.test(m[1]);
    const body = m[2].trim();
    if (new RegExp(`^\\{${STR}\\}$`).test(body)) add(JSON.parse(body.slice(1, -1)), where, plural);
    else if (!body.startsWith("{")) add(jsxText(body), where, plural); // {variable}: its value is marked with msg()
  }
  for (const m of src.matchAll(new RegExp(String.raw`\b(?:t|msg)\(\s*(${STR})`, "g"))) add(JSON.parse(m[1]), where);
  for (const m of src.matchAll(new RegExp(String.raw`\bt\.plural\([^,]+,\s*(${STR}),\s*(${STR})`, "g"))) add(JSON.parse(m[2]), where, true);
}

const locales = readdirSync(join(ROOT, "public/locales")).filter((f) => f.endsWith(".json"));
const wantMissing = process.argv.includes("--missing");
let problems = 0;
const missingAll = {};
for (const f of locales) {
  const messages = JSON.parse(readFileSync(join(ROOT, "public/locales", f), "utf8"));
  const missing = [...keys.keys()].filter((k) => !(k in messages));
  const unused = Object.keys(messages).filter((k) => !keys.has(k));
  const badPlural = [...keys].filter(([k, v]) => v.plural && typeof messages[k] === "string").map(([k]) => k);
  missingAll[f] = missing;
  problems += missing.length + badPlural.length;
  if (wantMissing) continue;
  console.log(`${f}: ${keys.size - missing.length}/${keys.size} translated` + (unused.length ? `, ${unused.length} unused` : ""));
  for (const k of missing) console.log(`  missing  ${JSON.stringify(k)}  (${keys.get(k).where})`);
  for (const k of badPlural) console.log(`  plural   ${JSON.stringify(k)} needs {"one": …, "other": …} forms`);
  for (const k of unused) console.log(`  unused   ${JSON.stringify(k)}`);
}
if (wantMissing) {
  const union = [...new Set(Object.values(missingAll).flat())];
  console.log(JSON.stringify(Object.fromEntries(union.map((k) => [k, keys.get(k).plural ? { one: "", other: "" } : ""])), null, 1));
}
process.exit(problems ? 1 : 0);
