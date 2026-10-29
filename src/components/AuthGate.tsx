"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { loadAuthFromStorage } from "@/redux/actions/auth";

/**
 * The auth pages themselves. Signed-out users may see these; signed-in users
 * get bounced off them, since "log in" is meaningless once you already are.
 */
function isAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup" || pathname === "/verify-email" || pathname === "/forgot-password";
}

/**
 * Paths under AuthGate readable without a login: only the auth pages. Public
 * pages (the landing page, player profiles, /privacy) live in the (public)
 * route group, outside AuthGate, so they never come through here.
 */
function isPublicPath(pathname: string): boolean {
  return isAuthPath(pathname);
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

  // Gate 1 — auth: redirect to /login unless path is public.
  // Also bounce already-authenticated users away from /login and /signup.
  useEffect(() => {
    if (!authInitialized) return;
    if (!token && !isPublicPath(pathname)) {
      router.replace("/login");
    }
    if (token && isAuthPath(pathname)) {
      router.replace("/home");
    }
  }, [authInitialized, token, pathname, router]);

  return <>{children}</>;
}
