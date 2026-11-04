"use client";

import { useState } from "react";

import { GoogleSignIn } from "@/components/GoogleSignIn";
import { LichessLogo } from "@/components/ui/LichessLogo";
import { startLichess } from "@/lib/lichessAuth";

/**
 * The ways in that skip the form, for /login and /signup: Google and Lichess,
 * then the line above the email form. One component, so the two pages never
 * offer different choices.
 */
export function SocialSignIn({ context, onError }: { context: "signin" | "signup"; onError: (message: string | null) => void }) {
  return (
    <div className="space-y-3">
      <GoogleSignIn context={context} onError={onError} />
      <LichessButton context={context} />
      <div className="flex items-center gap-3 pt-1 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
        <span className="h-px flex-1 bg-gray-200 dark:bg-dark-border" />
        or with email
        <span className="h-px flex-1 bg-gray-200 dark:bg-dark-border" />
      </div>
    </div>
  );
}

/** Google's button as a template (it draws its own, so this one copies it):
 * the same height, pill, border, type and colours in each theme, with the
 * logo beside the words. Two buttons that match read as one set of choices. */
function LichessButton({ context }: { context: "signin" | "signup" }) {
  const [leaving, setLeaving] = useState(false);
  return (
    <button
      type="button"
      disabled={leaving}
      onClick={() => {
        setLeaving(true);
        startLichess("signin").catch(() => setLeaving(false));
      }}
      className="mx-auto flex h-10 w-full max-w-[400px] items-center justify-center gap-2.5 rounded-full border border-[#dadce0] bg-white px-3 text-sm font-medium tracking-[0.25px] text-[#3c4043] hover:bg-[#f8faff] disabled:opacity-60 dark:border-[#202124] dark:bg-[#202124] dark:text-[#e8eaed] dark:hover:bg-[#2b2c2f]"
    >
      <LichessLogo size={20} className="shrink-0" />
      <span>{leaving ? "Opening Lichess…" : context === "signup" ? "Sign up with Lichess" : "Continue with Lichess"}</span>
    </button>
  );
}
