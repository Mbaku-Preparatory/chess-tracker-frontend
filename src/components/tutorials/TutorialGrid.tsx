"use client";

import { useState } from "react";

import { TutorialPlayer } from "@/components/tutorials/TutorialPlayer";
import { TUTORIALS, tutorialFiles, tutorialLength, type TutorialId } from "@/lib/tutorials";

/** Every tutorial as a card; tapping one plays it. */
export function TutorialGrid() {
  const [open, setOpen] = useState<TutorialId | null>(null);
  return (
    <>
      <ol className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {TUTORIALS.map((t, i) => (
          <li key={t.id}>
            <button type="button" onClick={() => setOpen(t.id)} className="group flex w-full flex-col gap-4 text-left">
              <span className="relative block overflow-hidden rounded-xl bg-ink-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tutorialFiles(t.id).poster} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover object-center transition-transform group-hover:scale-[1.02]" />
                {/* Bottom corner: the poster is the video's title card, so the middle has words on it */}
                <span className="absolute bottom-3 left-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-on shadow-lg group-hover:scale-105">
                  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className="ml-0.5 h-5 w-5"><path d="M4 2.5v11l9-5.5z" /></svg>
                </span>
                <span className="absolute bottom-3 right-3 rounded-pill bg-black/65 px-2.5 py-1 text-[13px] tabular-nums text-white">
                  {tutorialLength(t.seconds)}
                </span>
              </span>
              <span className="flex flex-col gap-1.5">
                <span className="text-[13px] tabular-nums text-accent-soft">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[20px] font-[480] leading-snug text-ink-text">{t.title}</span>
                <span className="text-[15px] leading-[1.5] text-ink-muted">{t.summary}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      {open && <TutorialPlayer id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
