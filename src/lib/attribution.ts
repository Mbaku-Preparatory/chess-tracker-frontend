/**
 * Where a visitor came from, noted on arrival and handed to their account once
 * they have one (backend users.SignupSource). Same rules as Bomahut's site:
 *
 *  - A link's utm_* (or an ad click ID: gclid, fbclid) is taken as given, and
 *    replaces an earlier note, so an ad click is never hidden behind an earlier
 *    Google visit.
 *  - With no link parameters, and nothing noted yet, the source is guessed from
 *    the referrer: google / organic, direct / none, <site> / referral.
 *  - Once sent to an account it is never changed again, so an existing user
 *    costs one request ever, not one per visit.
 *
 * Kept in localStorage, in this browser only. Signing up on another device
 * loses it, which costs a row in a count and nothing else. The values are the
 * browser's claim: the backend uses them for counting channels only.
 */

const KEY = "attribution:v1";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
// An unsent note this old describes some earlier visit, not the one that ends in a sign-up.
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_LENGTH = 255;

export type Attribution = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  gclid: string;
  fbclid: string;
  from_link: boolean;
  referrer_host: string;
  landing_path: string;
  first_seen_at: string;
};

type Stored = Attribution & { sent?: boolean };

const SEARCH: [RegExp, string][] = [
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)yahoo\.[a-z.]+$/, "yahoo"],
  [/(^|\.)yandex\.[a-z.]+$/, "yandex"],
  [/(^|\.)baidu\.com$/, "baidu"],
  [/(^|\.)ecosia\.org$/, "ecosia"],
  [/^search\.brave\.com$/, "brave"],
];
// Checked before SEARCH: mail.google.com is somebody's inbox, not a search.
const EMAIL: [RegExp, string][] = [
  [/^mail\.google\.com$/, "gmail"],
  [/(^|\.)(outlook\.live\.com|outlook\.office\.com)$/, "outlook"],
  [/^mail\.yahoo\.com$/, "yahoo-mail"],
];
// Checked before SEARCH: gemini.google.com is an assistant, not a search result.
const AI: [RegExp, string][] = [
  [/^gemini\.google\.com$/, "gemini"],
  [/(^|\.)(chatgpt\.com|chat\.openai\.com)$/, "chatgpt"],
  [/(^|\.)perplexity\.ai$/, "perplexity"],
  [/(^|\.)claude\.ai$/, "claude"],
  [/^copilot\.microsoft\.com$/, "copilot"],
];
const SOCIAL: [RegExp, string][] = [
  [/(^|\.)facebook\.com$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "x"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
  [/(^|\.)(t\.me|telegram\.org)$/, "telegram"],
];

function match(host: string, table: [RegExp, string][]): string | null {
  for (const [pattern, name] of table) if (pattern.test(host)) return name;
  return null;
}

const bare = (host: string) => host.replace(/^(www|m|l|lm)\./, "");

/** source / medium for a visit with no link parameters, from its referrer. */
export function sourceFromReferrer(referrer: string, ownHost: string): { source: string; medium: string; host: string } {
  let host = "";
  try {
    host = referrer ? new URL(referrer).hostname.toLowerCase() : "";
  } catch {
    host = "";
  }
  if (!host || bare(host) === bare(ownHost.toLowerCase()) || host === "localhost" || host === "127.0.0.1") {
    return { source: "direct", medium: "none", host: "" };
  }
  const email = match(host, EMAIL);
  if (email) return { source: email, medium: "email", host };
  const ai = match(host, AI);
  if (ai) return { source: ai, medium: "ai", host };
  const search = match(host, SEARCH);
  if (search) return { source: search, medium: "organic", host };
  const social = match(host, SOCIAL);
  if (social) return { source: social, medium: "social", host };
  return { source: bare(host), medium: "referral", host };
}

const clip = (v: string | null) => (v ?? "").trim().slice(0, MAX_LENGTH);

/** What this page load says about where the visitor came from. */
export function attributionFor(href: string, referrer: string, now: Date): Attribution {
  const url = new URL(href);
  const params = url.searchParams;
  const utm = Object.fromEntries(UTM_KEYS.map((k) => [k, clip(params.get(k))])) as Record<(typeof UTM_KEYS)[number], string>;
  const gclid = clip(params.get("gclid"));
  const fbclid = clip(params.get("fbclid"));
  const fromLink = UTM_KEYS.some((k) => utm[k]) || !!gclid || !!fbclid;
  const guessed = sourceFromReferrer(referrer, url.hostname);

  if (!utm.utm_source) {
    // An ad click ID without utm_* still names the network. fbclid rides on
    // every Facebook link, shared posts too, so it is social, not paid.
    if (gclid) Object.assign(utm, { utm_source: "google", utm_medium: utm.utm_medium || "cpc" });
    else if (fbclid) Object.assign(utm, { utm_source: "facebook", utm_medium: utm.utm_medium || "social" });
    else Object.assign(utm, { utm_source: guessed.source, utm_medium: utm.utm_medium || guessed.medium });
  }
  return {
    ...utm,
    gclid,
    fbclid,
    from_link: fromLink,
    referrer_host: guessed.host,
    landing_path: url.pathname.slice(0, 500),
    first_seen_at: now.toISOString(),
  };
}

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Stored;
    return value && typeof value === "object" && typeof value.utm_source === "string" ? value : null;
  } catch {
    return null;
  }
}

function write(value: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Private mode or storage blocked: this visit goes uncounted.
  }
}

/**
 * Note where this visit came from, by the rules at the top. Safe to call more
 * than once a page load; only the first call of a load looks.
 */
let capturedThisLoad = false;
export function captureAttribution(): void {
  if (capturedThisLoad || typeof window === "undefined") return;
  capturedThisLoad = true;
  const now = new Date();
  const visit = attributionFor(window.location.href, document.referrer, now);
  const stored = read();
  if (stored?.sent) return;
  const stale = !stored || now.getTime() - Date.parse(stored.first_seen_at) > MAX_AGE_MS || Number.isNaN(Date.parse(stored.first_seen_at));
  if (visit.from_link || stale) write(visit);
}

/** The note to send to a signed-in account, or null when there is none or it went already. */
export function unsentAttribution(): Attribution | null {
  const stored = read();
  if (!stored || stored.sent) return null;
  const { sent: _sent, ...attribution } = stored;
  return attribution;
}

export function markAttributionSent(): void {
  const stored = read();
  if (stored) write({ ...stored, sent: true });
}
