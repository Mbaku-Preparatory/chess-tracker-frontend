"use client";

import { useEffect, useRef } from "react";

import { tutorial, tutorialFiles, type TutorialId } from "@/lib/tutorials";

/**
 * A tutorial video over the page: phone-shaped (the videos are 9:16), with
 * subtitles on, starting as soon as it opens (the click that opened it counts
 * as the gesture browsers need for sound). Escape, the close button or a
 * click outside closes it.
 */
export function TutorialPlayer({ id, onClose }: { id: TutorialId; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const t = tutorial(id);
  const files = tutorialFiles(id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    video.current?.play().catch(() => {});
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Tutorial: ${t.title}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div className="relative flex max-h-full flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex w-full items-center justify-between gap-4 text-white">
          <p className="text-[15px] font-semibold">{t.title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the tutorial"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl leading-none hover:bg-white/25"
          >
            ×
          </button>
        </div>
        <video
          ref={video}
          className="aspect-[9/16] max-h-[calc(100dvh-6rem)] w-auto max-w-[calc(100vw-2rem)] rounded-2xl bg-black"
          src={files.video}
          poster={files.poster}
          controls
          playsInline
          preload="metadata"
        >
          <track kind="captions" src={files.captions} srcLang="en" label="English" default />
        </video>
      </div>
    </div>
  );
}
