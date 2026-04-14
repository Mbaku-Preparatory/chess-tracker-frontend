"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadAuthFromStorage } from "@/store/slices/authSlice";
import { loadRepertoireFromStorage } from "@/store/slices/repertoireSlice";

/**
 * Paths that are publicly accessible without a login.
 * - /login, /signup — auth pages themselves
 */
function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup";
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const { token, initialized: authInitialized } = useAppSelector((s) => s.auth);
  const { onboardingComplete, initialized: repertoireInitialized } = useAppSelector(
    (s) => s.repertoire
  );

  // Load persisted state from localStorage exactly once, client-side.
  useEffect(() => {
    dispatch(loadAuthFromStorage());
    dispatch(loadRepertoireFromStorage());
  }, [dispatch]);

  // Gate 1 — auth: redirect to /login unless path is public.
  // Also bounce already-authenticated users away from /login and /signup.
  useEffect(() => {
    if (!authInitialized) return;
    if (!token && !isPublicPath(pathname)) {
      router.replace("/login");
    }
    if (token && isPublicPath(pathname)) {
      router.replace("/");
    }
  }, [authInitialized, token, pathname, router]);

  // Gate 2 — onboarding: authenticated users who haven't set up a
  // repertoire are sent to /setup (except from /setup itself or public paths).
  useEffect(() => {
    if (!authInitialized || !repertoireInitialized) return;
    if (!token) return; // already handled by gate 1
    if (!onboardingComplete && pathname !== "/setup" && !isPublicPath(pathname)) {
      router.replace("/setup");
    }
  }, [authInitialized, repertoireInitialized, token, onboardingComplete, pathname, router]);

  return <>{children}</>;
}
