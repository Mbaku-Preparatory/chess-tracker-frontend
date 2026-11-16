"use client";

import { track } from "@vercel/analytics";

import { SharePanel } from "@/components/public/share/SharePanel";
import type { PersonalityType } from "@/lib/chessPersonality";
import { SITE_URL } from "@/lib/site";
import { useT } from "@/hooks/useT";

/**
 * Share a chess personality result. The link carries the sliders (?s=), so
 * whoever opens it sees the same result, with the type's preview image in the
 * chat; Instagram gets the type's story picture (story.png).
 */
export function ShareResult({ type, path, mine }: { type: PersonalityType; path: string; mine: boolean }) {
  const t = useT();
  const text = mine
    ? t("I'm {type} at chess. Which chess personality are you?", { type: t(type.name) })
    : t("{type}: {tagline} Which chess personality are you?", { type: t(type.name), tagline: t(type.tagline) });
  return (
    <SharePanel
      label={t("Share result")}
      text={text}
      url={`${SITE_URL}${path}`}
      picture={{ src: `/chess-personality/${type.slug}/story.png`, filename: `${type.slug}-chess-personality.png` }}
      onShared={(via) => track("Chess personality shared", { type: type.slug, via })}
    />
  );
}
