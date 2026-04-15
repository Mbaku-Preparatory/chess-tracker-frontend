"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadAuthFromStorage } from "@/store/slices/authSlice";
import { fetchRepertoire, setInitialized } from "@/store/slices/repertoireSlice";

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
    if (token && isPublicPath(pathname)) {
      router.replace("/");
    }
  }, [authInitialized, token, pathname, router]);

  return <>{children}</>;
}
