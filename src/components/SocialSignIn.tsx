"use client";

import { useState } from "react";

import { GoogleSignIn } from "@/components/GoogleSignIn";
import { ProviderLogo } from "@/components/ui/ProviderLogo";
import { enabledProviders, providerName, startLinkedSignIn, type Provider } from "@/lib/linkedAuth";

/**
 * The ways in that skip the form, for /login and /signup: Google, Lichess, and
 * Chess.com once it is switched on (lib/linkedAuth), then the line above the
 * email form. One component, so the two pages never offer different choices.
 */
export function SocialSignIn({ context, onError }: { context: "signin" | "signup"; onError: (message: string | null) => void }) {
  return (
    <div className="space-y-3">
      <GoogleSignIn context={context} onError={onError} />
      {enabledProviders().map((provider) => (
        <LinkedButton key={provider} provider={provider} context={context} />
      ))}
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
 * logo beside the words. Buttons that match read as one set of choices. */
function LinkedButton({ provider, context }: { provider: Provider; context: "signin" | "signup" }) {
  const [leaving, setLeaving] = useState(false);
  const name = providerName(provider);
  return (
    <button
      type="button"
      disabled={leaving}
      onClick={() => {
        setLeaving(true);
        startLinkedSignIn(provider, "signin").catch(() => setLeaving(false));
      }}
      className="mx-auto flex h-10 w-full max-w-[400px] items-center justify-center gap-2.5 rounded-full border border-[#dadce0] bg-white px-3 text-sm font-medium tracking-[0.25px] text-[#3c4043] hover:bg-[#f8faff] disabled:opacity-60 dark:border-[#202124] dark:bg-[#202124] dark:text-[#e8eaed] dark:hover:bg-[#2b2c2f]"
    >
      <ProviderLogo provider={provider} size={20} className="shrink-0" />
      <span>{leaving ? `Opening ${name}…` : context === "signup" ? `Sign up with ${name}` : `Continue with ${name}`}</span>
    </button>
  );
}
