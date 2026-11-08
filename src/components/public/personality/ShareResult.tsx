"use client";

import { track } from "@vercel/analytics";

import { SharePanel } from "@/components/public/share/SharePanel";
import type { PersonalityType } from "@/lib/chessPersonality";
import { SITE_URL } from "@/lib/site";

/**
 * Share a chess personality result. The link carries the sliders (?s=), so
 * whoever opens it sees the same result, with the type's preview image in the
 * chat; Instagram gets the type's story picture (story.png).
 */
export function ShareResult({ type, path, mine }: { type: PersonalityType; path: string; mine: boolean }) {
  const text = mine
    ? `I'm ${type.name} at chess. Which chess personality are you?`
    : `${type.name}: ${type.tagline} Which chess personality are you?`;
  return (
    <SharePanel
      label="Share result"
      text={text}
      url={`${SITE_URL}${path}`}
      picture={{ src: `/chess-personality/${type.slug}/story.png`, filename: `${type.slug}-chess-personality.png` }}
      onShared={(via) => track("Chess personality shared", { type: type.slug, via })}
    />
  );
}
