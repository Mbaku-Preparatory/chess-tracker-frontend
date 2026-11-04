"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@/lib/api";
import { loginRefusal, type AppError } from "@/lib/apiError";
import { providerName, takePending, type Provider } from "@/lib/linkedAuth";
import { useAppDispatch } from "@/redux/hooks";
import { setAuth } from "@/redux/actions/auth";
import { Logo } from "@/components/ui/Logo";

type Outcome =
  | { kind: "working" }
  | { kind: "error"; message: string; back: "login" | "settings" }
  // The email has an account that is not linked to this account on the other site.
  | { kind: "has-account"; message: string };

/** Where Lichess or Chess.com sends someone back after "Continue with …". */
function Return({ provider }: { provider: Provider }) {
  const name = providerName(provider);
  const params = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [outcome, setOutcome] = useState<Outcome>({ kind: "working" });
  // The code works once. React runs effects twice in development, and the
  // second run must not spend it again (or report the spent code as an error).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const pending = takePending(provider, params.get("state"));
    const back = pending?.mode === "connect" ? "settings" : "login";
    if (params.get("error")) {
      setOutcome({ kind: "error", message: `You cancelled on ${name}, so nothing changed.`, back });
      return;
    }
    const code = params.get("code");
    if (!pending || !code) {
      setOutcome({ kind: "error", message: `This ${name} sign-in expired or didn't start here. Please try again.`, back });
      return;
    }

    api
      .linkedSignIn(provider, {
        code,
        code_verifier: pending.verifier,
        redirect_uri: pending.redirectUri,
        connect: pending.mode === "connect",
      })
      .then((data) => {
        if ("access" in data) {
          dispatch(setAuth({ token: data.access, refreshToken: data.refresh, email: data.email }));
          router.replace("/home");
        } else {
          router.replace(`/settings?connected=${provider}`);
        }
      })
      .catch((err) => {
        const { status, body } = err as AppError;
        const message = loginRefusal(err).message;
        if (status === 409 && (body as { code?: string } | undefined)?.code === "email_has_account") {
          setOutcome({ kind: "has-account", message });
        } else {
          setOutcome({ kind: "error", message, back });
        }
      });
  }, [params, router, dispatch, provider, name]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card w-full max-w-sm p-6 text-center">
        <Logo size={40} variant="tile" className="mx-auto mb-4" />
        {outcome.kind === "working" && <p className="text-sm text-gray-600 dark:text-gray-300">Signing you in with {name}…</p>}
        {outcome.kind === "error" && (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-300">{outcome.message}</p>
            <Link href={outcome.back === "settings" ? "/settings" : "/login"} className="btn-primary mt-5 inline-flex">
              {outcome.back === "settings" ? "Back to Settings" : "Back to sign in"}
            </Link>
          </>
        )}
        {outcome.kind === "has-account" && (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-300">{outcome.message}</p>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              You only do this once. After that, Continue with {name} takes you straight in.
            </p>
            <Link href="/login" className="btn-primary mt-5 inline-flex">
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

/** The page body for app/(app)/auth/<provider>. */
export function LinkedReturn({ provider }: { provider: Provider }) {
  return (
    <Suspense>
      <Return provider={provider} />
    </Suspense>
  );
}
