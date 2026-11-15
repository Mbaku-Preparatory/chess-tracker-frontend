"use client";

import { useSyncExternalStore } from "react";

import { FILE, fill, LOCALE_KEY, type Locale, type Messages, type Vars } from "@/lib/i18n";

/**
 * The reader's language for client code: useT() for strings, useLocale() for
 * the code, setLocale() for the globe. See lib/i18n.ts for how it works.
 */

declare global {
  interface Window {
    __locale?: Locale;
    __messages?: Promise<Messages>;
  }
}

// One store for the whole page, outside React: every <T> and useT() reads it,
// and the server (which has no window) always sees English.
type State = { locale: Locale; messages: Messages };
const ENGLISH: State = { locale: "en", messages: {} };
let state: State = ENGLISH;
let started = false;
const listeners = new Set<() => void>();

function publish(next: State) {
  state = next;
  document.documentElement.lang = next.locale;
  listeners.forEach((l) => l());
}

async function load(locale: Locale, pending?: Promise<Messages>) {
  if (locale === "en") return publish(ENGLISH);
  try {
    const messages = await (pending ?? fetch(FILE(locale)).then((r) => r.json() as Promise<Messages>));
    publish({ locale, messages });
  } catch {
    // Offline or the file is missing: stay readable, in English.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    const locale = window.__locale ?? "en";
    if (locale !== "en") void load(locale, window.__messages);
  }
  return () => listeners.delete(listener);
}

export function setLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // Storage blocked: the switch still works until the page is left.
  }
  void load(locale);
}

export type Translate = ((text: string, vars?: Vars) => string) & {
  plural: (n: number, one: string, other: string, vars?: Vars) => string;
};

function translator({ locale, messages }: State): Translate {
  const t = (text: string, vars?: Vars) => {
    const found = messages[text];
    return fill(typeof found === "string" ? found : text, vars);
  };
  t.plural = (n: number, one: string, other: string, vars?: Vars) => {
    const all = { n, ...vars };
    const found = messages[other];
    if (found === undefined) return fill(n === 1 ? one : other, all);
    if (typeof found === "string") return fill(found, all);
    const rule = new Intl.PluralRules(locale).select(n);
    return fill(found[rule] ?? found.other ?? other, all);
  };
  return t;
}

// Built once per state, so components get a stable function between switches.
const cache = new WeakMap<State, Translate>();
const translate = (s: State) => {
  let t = cache.get(s);
  if (!t) cache.set(s, (t = translator(s)));
  return t;
};

const useStore = () => useSyncExternalStore(subscribe, () => state, () => ENGLISH);

export const useLocale = (): Locale => useStore().locale;
export const useT = (): Translate => translate(useStore());
