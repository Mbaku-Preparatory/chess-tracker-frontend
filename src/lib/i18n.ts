/**
 * The site in other languages, chosen with the globe in the header.
 *
 * Pages are always rendered and cached in English: the same URL serves every
 * language, so a cached player profile is stored once, not once per language
 * (each stored page costs money on Vercel). A reader's language is applied in
 * the browser, after the English has arrived.
 *
 * The English text in the code is the key. A translation file is a flat map
 * from that exact English to the translation, in public/locales/<code>.json,
 * fetched only by someone reading in that language. English readers download
 * nothing extra. A string with no translation (new, or reworded since it was
 * translated) simply stays in English. `pnpm i18n:check` lists them, and
 * fails on English the site shows that is not wrapped at all.
 *
 * The hooks and the store are in hooks/useT.ts.
 *
 * In a page: <T>Some text</T>, or <T vars={{ n }}>{"{n} games"}</T>.
 * In a client component: const t = useT(); t("Some text"), t("{n} games", { n }).
 * Counted nouns: t.plural(n, "{n} game", "{n} games"); the translation of the
 * second (the "other" form) gives the forms its language uses (Russian
 * one/few/many/other). Call t.plural directly, not through a helper, or the
 * checker cannot see the key.
 *
 * Adding a language: a line in LOCALES below, then
 * `pnpm i18n:check --missing <code> > public/locales/<code>.json` and translate
 * it. Dates, plural rules, numbers and country names come from the browser.
 * Not supported yet: right-to-left scripts (nothing flips direction), and
 * regional variants (the device's language is matched on its first two
 * letters, so pt-BR and pt-PT are one "pt").
 */
export const LOCALES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "ru", name: "Русский" },
  { code: "hi", name: "हिन्दी" },
  { code: "sw", name: "Kiswahili" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export type Forms = Partial<Record<Intl.LDMLPluralRule, string>>;
export type Messages = Record<string, string | Forms>;
export type Vars = Record<string, string | number>;

/** The locale for dates: British English for "en" (day before month, as the
 * site always showed them), the language itself otherwise. */
export const dateLocale = (locale: string) => (locale === "en" ? "en-GB" : locale);

/** "{n} games" with { n: 3 } is "3 games". A name with no value stays as it is. */
export const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;

export const LOCALE_KEY = "locale";
const LOCALE_DIR = "/locales/";
export const FILE = (code: string) => `${LOCALE_DIR}${code}.json`;

/**
 * Inlined into <head>, like the theme script (lib/theme.ts): picks the
 * language (the saved choice, else the device's first language we have, else
 * English), puts it on <html lang>, and starts downloading its translations at
 * once, in parallel with the page's code, so the English shows as briefly as
 * possible. A string because it runs before any bundle loads.
 */
export const LOCALE_SCRIPT = `(function(){try{var c=${JSON.stringify(LOCALES.map((l) => l.code))},s=localStorage.getItem(${JSON.stringify(LOCALE_KEY)}),l=c.indexOf(s)>=0?s:"en";if(!s){var n=navigator.languages||[navigator.language];for(var i=0;i<n.length;i++){var p=String(n[i]).slice(0,2).toLowerCase();if(c.indexOf(p)>=0){l=p;break}}}window.__locale=l;document.documentElement.lang=l;if(l!=="en")window.__messages=fetch(${JSON.stringify(LOCALE_DIR)}+l+".json").then(function(r){return r.json()})}catch(e){}})();`;

/**
 * Marks English kept in a constant or list for translation, without
 * translating it there: `const PARTS = [{ title: msg("Ratings and ranks") }]`,
 * then <T>{part.title}</T> where it is shown. It returns its argument; it is
 * how `pnpm i18n:check` finds text that is not written inline.
 */
export const msg = (english: string): string => english;
