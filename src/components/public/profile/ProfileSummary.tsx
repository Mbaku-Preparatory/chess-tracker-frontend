"use client";

import { useLocale, useT } from "@/hooks/useT";
import { federationFor, federationName } from "@/lib/federations";
import { summary, translatedSummary, type SummaryPlayer } from "@/lib/profileSummary";

/** The profile's opening paragraph: the English one (also the meta
 * description) on the server, the reader's language in the browser. */
export function ProfileSummary({ player, className }: { player: SummaryPlayer; className?: string }) {
  const locale = useLocale();
  const t = useT();
  const fed = federationFor(player.federation);
  const known = fed.name !== player.federation; // federationFor's stand-in is the bare code
  const text = locale === "en" ? summary(player, fed.name) : translatedSummary(player, known ? federationName(fed, locale) : "", t);
  return <p className={className}>{text}</p>;
}
