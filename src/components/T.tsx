"use client";

import { useT } from "@/hooks/useT";
import type { Vars } from "@/lib/i18n";

/**
 * A piece of text in the reader's language, for server components (client
 * components call useT() directly). The server and the first render show the
 * English it wraps; see lib/i18n.ts.
 *
 * The child must be one plain string, the English exactly as the translation
 * files have it: <T>Rankings</T>, or {"…"} for text with \u escapes or {n}.
 */
export function T({ children, vars }: { children: string; vars?: Vars }) {
  return <>{useT()(children, vars)}</>;
}
