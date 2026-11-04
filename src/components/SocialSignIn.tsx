"use client";

import { useState } from "react";

import { GoogleSignIn } from "@/components/GoogleSignIn";
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

/** Sized to sit under Google's button: same height, pill, at most 400px. */
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
      className="mx-auto flex h-10 w-full max-w-[400px] items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:hover:bg-dark-border"
    >
      {leaving ? "Opening Lichess…" : context === "signup" ? "Sign up with Lichess" : "Continue with Lichess"}
    </button>
  );
}
