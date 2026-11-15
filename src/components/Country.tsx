"use client";

import { useLocale } from "@/hooks/useT";
import { federationFor, federationName } from "@/lib/federations";

/** A federation's name in the reader's language, for server components
 * (English on the server). Client code can call federationName directly. */
export function Country({ code }: { code: string }) {
  return <>{federationName(federationFor(code), useLocale())}</>;
}
