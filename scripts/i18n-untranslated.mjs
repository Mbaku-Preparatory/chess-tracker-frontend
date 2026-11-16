// Finds English the site shows that is not marked for translation: text
// between JSX tags, the attributes a reader sees or hears (placeholder,
// title, aria-label, alt, label) and string literals rendered from a JSX
// expression ({won ? "Win" : "Loss"}). Used by i18n-check.mjs.
//
// It reads the code with the TypeScript parser, so it sees what React will
// render, not lines that merely look like words. Not flagged:
//   - text already inside t(), tr(), msg(), t.plural() or <T>
//   - names that are the same in every language (NAMES), and values that are
//     not prose (an email, a username, a domain)
//   - attributes in a server component: t() needs the reader's language,
//     which only the browser knows, so a server component can translate the
//     text it renders (<T>) but not an attribute's value
//   - anything on, or right after, a line with an `i18n-ignore: <why>`
//     comment, and a whole file with an `i18n-ignore-file: <why>` one. The
//     reason is required, so the next reader knows it is on purpose.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";

const ts = createRequire(import.meta.url)("typescript");

const ATTRS = new Set(["placeholder", "title", "aria-label", "alt", "label"]);
const CALLS = /^(t|tr|msg|t\.plural|tr\.plural|fill)$/;
// Names, not words: the same in every language.
const NAMES = /Chess Preparatory|Chess\.com|Chess-Results|Lichess|FIDE|Stockfish|ChessDB|Paystack|M-Pesa|WhatsApp|Facebook|Instagram|Telegram|X \/ Twitter|Mbaku AI|Mbaku|Google|PGN|English/g;
const IGNORE = /i18n-ignore:\s*\S/;
const IGNORE_FILE = /i18n-ignore-file:\s*\S/;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : name.endsWith(".tsx") ? [path] : [];
  });
}

/** Words a reader would need translated: something left once names, numbers and symbols are gone. */
function isProse(text) {
  const rest = text.replace(NAMES, "").trim();
  if (!/[A-Za-z]{2,}/.test(rest)) return false;
  if (!/\s/.test(rest) && /[@_.]/.test(rest)) return false; // you@example.com, ada_lovelace, chesspreparatory.com
  return true;
}

/** Already marked: inside a translating call or <T>, or the value of an attribute nobody reads. */
function marked(node) {
  let element = false; // passed an element on the way up: an attribute above it is not this text's
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isCallExpression(p) && CALLS.test(p.expression.getText())) return true;
    if (ts.isJsxElement(p) && p.openingElement.tagName.getText() === "T") return true;
    if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p)) element = true;
    if (ts.isJsxAttribute(p) && !element && !ATTRS.has(p.name.getText())) return true; // className, href…
    if (ts.isBlock(p) || ts.isSourceFile(p)) return false;
  }
  return false;
}

/** The JSX expression a literal is rendered from, through a ternary or &&;
 * null when it is compared with, or a condition, not shown. */
function renderedIn(node) {
  let p = node.parent;
  while (p && (ts.isConditionalExpression(p) || ts.isParenthesizedExpression(p) || ts.isBinaryExpression(p))) {
    if (ts.isBinaryExpression(p) && /^[!=]==?$/.test(p.operatorToken.getText())) return null; // colour === "White"
    if (ts.isConditionalExpression(p) && p.condition === node) return null;
    p = p.parent;
  }
  return p && ts.isJsxExpression(p) ? p : null;
}

/** [{ file, line, text }] for every piece of English that is not marked. */
export function untranslated(root) {
  const found = [];
  for (const file of files(join(root, "src"))) {
    const src = readFileSync(file, "utf8");
    if (IGNORE_FILE.test(src)) continue;
    const client = /^\s*["']use client["']/.test(src);
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const lines = src.split("\n");
    const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line;
    const ignored = (n) => {
      const l = lineOf(n);
      return IGNORE.test(lines[l]) || IGNORE.test(lines[l - 1] ?? "");
    };
    const hit = (n, text) => {
      if (isProse(text) && !marked(n) && !ignored(n)) found.push({ file: relative(root, file), line: lineOf(n) + 1, text });
    };
    const visit = (n) => {
      if (ts.isJsxText(n)) hit(n, n.getText().replace(/\s+/g, " ").trim());
      else if (ts.isJsxAttribute(n) && ATTRS.has(n.name.getText()) && n.initializer && ts.isStringLiteral(n.initializer)) {
        if (client) hit(n, n.initializer.text);
      } else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
        const expr = renderedIn(n);
        const attr = expr && ts.isJsxAttribute(expr.parent) ? expr.parent : null;
        if (expr && (!attr || client)) hit(n, n.text); // marked() skips attributes nobody reads
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return found;
}
