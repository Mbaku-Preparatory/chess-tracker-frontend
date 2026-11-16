"use client";

import { useState } from "react";

import { PlayIcon } from "@/components/ui/PlayIcon";
import { useT } from "@/hooks/useT";
import { tutorialLength } from "@/lib/tutorials";

// The three files are the 16:9 cut in marketing/promo-voiceover (af_heart voice),
// re-encoded to 720p for the web: public/promo/chess-preparatory.{mp4,jpg,vtt}.
const FILES = "/promo/chess-preparatory";
const SECONDS = 57;

/**
 * The homepage video. Until someone presses play it is only its poster, a
 * ~35 KB image: no <video> element exists yet, so the 2 MB file is never
 * fetched by a visitor who doesn't watch, nor by a crawler. The click that
 * swaps it in is the gesture browsers want before playing with sound, so it
 * starts at once, inline, with the usual controls.
 *
 * Every spoken line is written large in the video, so the subtitle track is
 * there for whoever turns it on, not on by default.
 */
export function PromoVideo({ className = "" }: { className?: string }) {
  const t = useT();
  const [playing, setPlaying] = useState(false);
  const frame = `relative block aspect-video w-full overflow-hidden rounded-2xl bg-ink-card ${className}`;

  if (playing) {
    return (
      <video className={frame} src={`${FILES}.mp4`} poster={`${FILES}.jpg`} controls autoPlay playsInline>
        <track kind="captions" src={`${FILES}.vtt`} srcLang="en" label="English" />
      </video>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={t("Play the Chess Preparatory video ({length})", { length: tutorialLength(SECONDS) })}
      className={`group ${frame}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 720p poster; the image optimiser would add a cost per visit for nothing */}
      <img src={`${FILES}.jpg`} alt="" width={1280} height={720} className="h-full w-full object-cover" />
      <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-on shadow-lg group-hover:scale-105">
        <PlayIcon className="ml-1 h-7 w-7" />
      </span>
      <span className="absolute bottom-3 right-3 rounded-pill bg-black/65 px-2.5 py-1 text-[13px] tabular-nums text-white">{tutorialLength(SECONDS)}</span>
    </button>
  );
}
