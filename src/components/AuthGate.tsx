"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { loadAuthFromStorage } from "@/redux/actions/auth";
import { fetchRepertoire, setInitialized } from "@/redux/actions/repertoire";

/**
 * The auth pages themselves. Signed-out users may see these; signed-in users
 * get bounced off them, since "log in" is meaningless once you already are.
 */
function isAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup" || pathname === "/verify-email";
}

/**
 * Paths readable without a login. A superset of the auth pages: /privacy must
 * also be reachable by *anyone*, including Google Play's reviewers, who open
 * the policy URL with no account — but unlike an auth page it must stay
 * readable while signed in too, so it deliberately isn't an isAuthPath.
 */
function isPublicPath(pathname: string): boolean {
  return isAuthPath(pathname) || pathname === "/privacy";
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const { token, initialized: authInitialized } = useAppSelector((s) => s.auth);

  // Load auth from localStorage exactly once, client-side.
  useEffect(() => {
    dispatch(loadAuthFromStorage());
  }, [dispatch]);

  // Once auth is resolved, either fetch repertoire from the API (authenticated)
  // or mark it as initialized with empty defaults (unauthenticated).
  useEffect(() => {
    if (!authInitialized) return;
    if (token) {
      dispatch(fetchRepertoire());
    } else {
      dispatch(setInitialized());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authInitialized]);

  // Gate 1 — auth: redirect to /login unless path is public.
  // Also bounce already-authenticated users away from /login and /signup.
  useEffect(() => {
    if (!authInitialized) return;
    if (!token && !isPublicPath(pathname)) {
      router.replace("/login");
    }
    if (token && isAuthPath(pathname)) {
      router.replace("/");
    }
  }, [authInitialized, token, pathname, router]);

  return <>{children}</>;
}
