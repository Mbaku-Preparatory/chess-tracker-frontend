// Checks the site's translations (see src/lib/i18n.ts). It reports, and exits
// 1 for:
//   - English shown through <T>, t(), t.plural() and msg() that a file in
//     public/locales/ lacks;
//   - a count whose translation lacks a plural form its language uses
//     (Russian needs one/few/many, Arabic six);
//   - English the site shows that is not marked for translation at all
//     (scripts/i18n-untranslated.mjs).
// And lists translations whose English is gone (reworded or deleted).
//
//   pnpm i18n:check                  the report
//   pnpm i18n:check --missing        the English every file lacks, as JSON to translate
//   pnpm i18n:check --missing sw     what sw.json lacks, with Swahili's plural forms
//                                    (all of it, for a new language without a file yet)
import { existsSync, readFileSync, readdirSync, statSync, writeSync } from "node:fs";
import { join } from "node:path";

import { untranslated } from "./i18n-untranslated.mjs";

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
  // <T attr="…" attr={…}>text</T>: one= makes it a count, keyed by the text (the
  // "other" form). Attributes are scanned by brace depth, since a value can be
  // an element with its own {…} inside.
  for (let at = src.indexOf("<T"); at !== -1; at = src.indexOf("<T", at + 2)) {
    if (!/[\s>]/.test(src[at + 2] ?? "")) continue; // <Tab>, <TutorialLink>…
    let i = at + 2, depth = 0, quote = "";
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) { if (c === quote) quote = ""; continue; }
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    const attrs = src.slice(at + 2, i);
    if (attrs.trimEnd().endsWith("/")) continue;
    const close = src.indexOf("</T>", i);
    if (close === -1) continue;
    const plural = /\sone=/.test(attrs);
    const body = src.slice(i + 1, close).trim();
    if (new RegExp(`^\\{${STR}\\}$`).test(body)) add(JSON.parse(body.slice(1, -1)), where, plural);
    else if (!body.startsWith("{")) add(jsxText(body), where, plural); // {variable}: its value is marked with msg()
  }
  // t(), or tr() where a component already has a "t" (a tutorial, a type).
  for (const m of src.matchAll(new RegExp(String.raw`\b(?:t|tr|msg)\(\s*(${STR})`, "g"))) add(JSON.parse(m[1]), where);
  for (const m of src.matchAll(new RegExp(String.raw`\btr?\.plural\([^,]+,\s*(${STR}),\s*(${STR})`, "g"))) add(JSON.parse(m[2]), where, true);
}

// The plural forms a language uses for whole numbers. Intl also knows forms
// only fractions or millions take (Spanish "many" is for 1,000,000); a count
// of games never needs those, and t.plural falls back to "other".
const formsOf = (code) => {
  const rules = new Intl.PluralRules(code);
  return [...new Set(Array.from({ length: 201 }, (_, n) => rules.select(n)))];
};

const LOCALE_DIR = join(ROOT, "public/locales");
const locales = readdirSync(LOCALE_DIR).filter((f) => f.endsWith(".json"));
const at = process.argv.indexOf("--missing");
if (at !== -1) {
  // What one language, or every file, still needs: JSON to fill in.
  const code = process.argv[at + 1];
  const file = code && join(LOCALE_DIR, `${code}.json`);
  const have = code ? [existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {}] : locales.map((f) => JSON.parse(readFileSync(join(LOCALE_DIR, f), "utf8")));
  const forms = code ? formsOf(code) : ["one", "other"];
  const lacking = [...keys.keys()].filter((k) => have.some((m) => !(k in m)));
  // Written synchronously: process.exit() would cut off a pipe at 64 KB.
  writeSync(1, JSON.stringify(Object.fromEntries(lacking.map((k) => [k, keys.get(k).plural ? Object.fromEntries(forms.map((f) => [f, ""])) : ""])), null, 1) + "\n");
  process.exit(0);
}

let problems = 0;
for (const f of locales) {
  const messages = JSON.parse(readFileSync(join(LOCALE_DIR, f), "utf8"));
  const forms = formsOf(f.replace(/\.json$/, ""));
  const missing = [...keys.keys()].filter((k) => !(k in messages));
  const unused = Object.keys(messages).filter((k) => !keys.has(k));
  const badPlural = [...keys]
    .filter(([k, v]) => v.plural && k in messages)
    .map(([k]) => [k, typeof messages[k] === "string" ? forms : forms.filter((form) => !(form in messages[k]))])
    .filter(([, lacks]) => lacks.length);
  problems += missing.length + badPlural.length;
  console.log(`${f}: ${keys.size - missing.length}/${keys.size} translated` + (unused.length ? `, ${unused.length} unused` : ""));
  for (const k of missing) console.log(`  missing  ${JSON.stringify(k)}  (${keys.get(k).where})`);
  for (const [k, lacks] of badPlural) console.log(`  plural   ${JSON.stringify(k)} lacks the ${lacks.join(", ")} form${lacks.length > 1 ? "s" : ""}`);
  for (const k of unused) console.log(`  unused   ${JSON.stringify(k)}`);
}

const english = untranslated(ROOT);
problems += english.length;
console.log(english.length ? `untranslated: ${english.length} piece${english.length > 1 ? "s" : ""} of English not marked for translation` : "untranslated: none");
for (const { file, line, text } of english) console.log(`  english  ${file}:${line}  ${JSON.stringify(text.slice(0, 100))}`);
if (english.length) console.log('  Wrap it in t() or <T>, or, if it must stay English, add an "i18n-ignore: <why>" comment on the line before.');

// exitCode, not exit(): the report must reach the end of a pipe first.
process.exitCode = problems ? 1 : 0;
