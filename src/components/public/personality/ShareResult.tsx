"use client";

import { track } from "@vercel/analytics";
import { useEffect, useState } from "react";

import type { PersonalityType } from "@/lib/chessPersonality";
import { SITE_URL } from "@/lib/site";

const button =
  "inline-flex items-center justify-center rounded-pill border border-ink-line px-4 py-2.5 text-[15px] text-ink-text hover:bg-ink-raised";

/**
 * Share a result. The link carries the sliders (?s=), so whoever opens it sees
 * the same result, and the type's own preview image shows in the chat.
 * WhatsApp first: it is how chess is shared in India and Kenya, the two
 * biggest audiences.
 */
export function ShareResult({ type, path, mine }: { type: PersonalityType; path: string; mine: boolean }) {
  const url = `${SITE_URL}${path}`;
  const text = mine
    ? `I'm ${type.name} at chess. Which chess personality are you?`
    : `${type.name}: ${type.tagline} Which chess personality are you?`;
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  const sent = (via: string) => track("Chess personality shared", { type: type.slug, via });

  return (
    <div className="flex flex-wrap gap-2">
      {canShare && (
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-pill bg-accent px-5 py-2.5 text-[15px] font-[480] text-accent-on hover:bg-accent-soft"
          onClick={() => {
            navigator.share({ title: type.name, text, url }).then(() => sent("device"), () => {});
          }}
        >
          Share
        </button>
      )}
      <a className={button} href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener" onClick={() => sent("whatsapp")}>
        WhatsApp
      </a>
      <a
        className={button}
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener"
        onClick={() => sent("x")}
      >
        X
      </a>
      <button
        type="button"
        className={button}
        onClick={() => {
          navigator.clipboard?.writeText(url).then(
            () => {
              setCopied(true);
              sent("copy");
              window.setTimeout(() => setCopied(false), 2000);
            },
            () => {},
          );
        }}
      >
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
