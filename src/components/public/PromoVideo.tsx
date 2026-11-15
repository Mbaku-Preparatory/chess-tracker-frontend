"use client";

import { useState } from "react";

import { PlayIcon } from "@/components/ui/PlayIcon";
import { tutorialLength } from "@/lib/tutorials";

// The three files are made from marketing/promo-voiceover (af_heart voice),
// re-encoded to 720p for the web: public/promo/chess-preparatory.{mp4,jpg,vtt}.
const FILES = "/promo/chess-preparatory";
const SECONDS = 57;

/**
 * The homepage video. Until someone presses play it is only its poster, a
 * ~50 KB image: no <video> element exists yet, so the 3 MB file is never
 * fetched by a visitor who doesn't watch, nor by a crawler. The click that
 * swaps it in is the gesture browsers want before playing with sound, so it
 * starts at once, inline, with the usual controls.
 *
 * The video has its key words burned in, so the subtitle track is there for
 * whoever turns it on, not on by default.
 */
export function PromoVideo({ className = "" }: { className?: string }) {
  const [playing, setPlaying] = useState(false);
  // 9:16 and capped by the screen's height: on a phone the headline still
  // shows under it, and on a desktop it stays level with the search beside it.
  const frame = `relative block aspect-[9/16] w-full max-w-[calc(65svh*9/16)] overflow-hidden rounded-2xl bg-ink-card md:max-w-[calc(min(78svh,720px)*9/16)] ${className}`;

  if (playing) {
    return (
      <video className={frame} src={`${FILES}.mp4`} poster={`${FILES}.jpg`} controls autoPlay playsInline>
        <track kind="captions" src={`${FILES}.vtt`} srcLang="en" label="English" />
      </video>
    );
  }
  return (
    <button type="button" onClick={() => setPlaying(true)} aria-label={`Play the Chess Preparatory video (${SECONDS} seconds)`} className={`group ${frame}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 720px poster; the image optimiser would add a cost per visit for nothing */}
      <img src={`${FILES}.jpg`} alt="" width={720} height={1280} className="h-full w-full object-cover" />
      <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-on shadow-lg group-hover:scale-105">
        <PlayIcon className="ml-1 h-7 w-7" />
      </span>
      <span className="absolute bottom-3 right-3 rounded-pill bg-black/65 px-2.5 py-1 text-[13px] tabular-nums text-white">{tutorialLength(SECONDS)}</span>
    </button>
  );
}
