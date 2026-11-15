"use client";

import { Fragment, isValidElement } from "react";

import { useT } from "@/hooks/useT";

type Vars = Record<string, string | number | React.ReactElement>;

/**
 * A piece of text in the reader's language, for server components (client
 * components call useT() directly). The server and the first render show the
 * English it wraps; see lib/i18n.ts.
 *
 * The child must be one plain string, the English exactly as the translation
 * files have it: <T>Rankings</T>, or {"…"} for text with \u escapes or {n}.
 * A count: <T n={games} one="{n} game">{"{n} games"}</T>.
 * A value may be an element, placed where the translation puts it:
 * <T vars={{ country: <Country code="KEN" /> }}>{"#{rank} in {country}"}</T>.
 */
export function T({ children, vars = {}, n, one }: { children: string; vars?: Vars; n?: number; one?: string }) {
  const t = useT();
  const text: Record<string, string | number> = {};
  const nodes: Record<string, React.ReactElement> = {};
  for (const [k, v] of Object.entries(vars)) (isValidElement(v) ? nodes : text)[k] = v as never;

  const out = n != null && one != null ? t.plural(n, one, children, text) : t(children, text);
  if (!Object.keys(nodes).length) return <>{out}</>;
  // split() with a capture group keeps the names at the odd places.
  return (
    <>
      {out.split(/\{(\w+)\}/).map((piece, i) => (
        <Fragment key={i}>{i % 2 ? (nodes[piece] ?? `{${piece}}`) : piece}</Fragment>
      ))}
    </>
  );
}
