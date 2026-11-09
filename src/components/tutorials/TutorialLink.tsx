"use client";

import { useState } from "react";

import { TutorialPlayer } from "@/components/tutorials/TutorialPlayer";
import { tutorial, tutorialLength, type TutorialId } from "@/lib/tutorials";

/**
 * "▶ Watch how (41s)" on the screen a tutorial explains; opens it in the
 * player. The app's colours by default; a page in the public site's colours
 * (the bot view) passes its own `className`.
 */
export function TutorialLink({ id, className }: { id: TutorialId; className?: string }) {
  const [open, setOpen] = useState(false);
  const t = tutorial(id);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50"
        }
      >
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className="h-3.5 w-3.5"><path d="M4 2.5v11l9-5.5z" /></svg>
        Watch how <span className="opacity-70">({tutorialLength(t.seconds)})</span>
      </button>
      {open && <TutorialPlayer id={id} onClose={() => setOpen(false)} />}
    </>
  );
}
