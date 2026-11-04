"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setAuth } from "@/redux/actions/auth";

/** Public: Google puts it in the page anyway. The env var is for a second
 * project (staging); production uses this one. */
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "450683232233-n8v32rm3ldt2f9thkj2nkupaejh5h2ur.apps.googleusercontent.com";

// The parts of Google Identity Services this uses.
interface GoogleId {
  initialize(config: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: "popup"; context?: string; itp_support?: boolean }): void;
  renderButton(el: HTMLElement, options: Record<string, string | number>): void;
  prompt(): void;
  cancel(): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

/**
 * "Continue with Google", for the sign-in and sign-up pages: Google's own
 * button, plus One Tap for someone already signed in to Google in this
 * browser. Google has verified the address, so there is no code to type: the
 * backend signs them in, or creates the account, and they land on /home.
 */
export function GoogleSignIn({ context, onError }: { context: "signin" | "signup"; onError: (message: string | null) => void }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const dark = useAppSelector((s) => s.theme.mode) === "dark";
  const holder = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  // Google keeps the callback it was first given, so it reads these through refs.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const signIn = useCallback(
    async ({ credential }: { credential: string }) => {
      setBusy(true);
      onErrorRef.current(null);
      try {
        const data = await api.googleSignIn(credential);
        dispatch(setAuth({ token: data.access, refreshToken: data.refresh, email: data.email }));
        router.replace("/home");
      } catch (err) {
        onErrorRef.current(userMessage(err, "Google sign-in didn't work. Try again, or use your email."));
        setBusy(false);
      }
    },
    [dispatch, router],
  );
  const signInRef = useRef(signIn);
  signInRef.current = signIn;

  useEffect(() => {
    const id = window.google?.accounts.id;
    if (!ready || !id || !holder.current) return;
    id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (r) => signInRef.current(r),
      ux_mode: "popup",
      context: context === "signup" ? "signup" : "signin",
      itp_support: true,
    });
    // Google draws its button at a fixed pixel width, at most 400.
    id.renderButton(holder.current, {
      type: "standard",
      theme: dark ? "filled_black" : "outline",
      size: "large",
      text: context === "signup" ? "signup_with" : "continue_with",
      shape: "pill",
      logo_alignment: "center",
      width: Math.min(400, holder.current.offsetWidth || 320),
    });
    id.prompt();
    return () => id.cancel();
  }, [ready, dark, context]);

  return (
    <div>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setReady(true)} />
      {/* Holds the button's height while Google's script loads, so the form below doesn't jump. */}
      <div ref={holder} className={`flex min-h-[44px] justify-center ${busy ? "pointer-events-none opacity-50" : ""}`} />
      {busy && <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">Signing you in…</p>}
    </div>
  );
}

/** The line between the Google button and the email form. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
      <span className="h-px flex-1 bg-gray-200 dark:bg-dark-border" />
      or with email
      <span className="h-px flex-1 bg-gray-200 dark:bg-dark-border" />
    </div>
  );
}
