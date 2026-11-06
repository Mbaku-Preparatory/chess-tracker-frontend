"use client";

/**
 * The paywall, on the web: who may use the app right now, read from the
 * backend (GET /api/subscriptions/me/), and the redirect for those who may not.
 *
 * The backend is the authority. It refuses every product endpoint with a 402
 * once access has run out, and the API clients turn a 402 into the same
 * redirect (lib/subscription.ts), so this gate only spares the user a page
 * that loads and then fails. It re-asks on every navigation: cheap, and it is
 * how a trial that ends while the tab is open takes effect.
 *
 * Inside AuthGate, so it only ever runs for a signed-in user.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { isOpenWithoutAccess, SUBSCRIPTION_EXPIRED_PATH } from "@/lib/subscription";
import { useAppSelector } from "@/redux/hooks";
import type { MySubscription } from "@/types";

interface SubscriptionContextValue {
  /** Null until the first answer arrives (or when signed out). */
  subscription: MySubscription | null;
  /** Ask again now, e.g. after a payment. Resolves with the fresh answer. */
  refresh: () => Promise<MySubscription | null>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  refresh: async () => null,
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

/** The auth pages and the sign-in callbacks: nothing to check there. */
function isAuthFlow(pathname: string): boolean {
  return ["/login", "/signup", "/verify-email", "/forgot-password", "/auth/lichess", "/auth/chesscom"].includes(pathname);
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAppSelector((s) => s.auth.token);
  const [subscription, setSubscription] = useState<MySubscription | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await api.getMySubscription();
      setSubscription(next);
      return next;
    } catch {
      // Unreachable or signed out: no answer is not "expired". The backend
      // still refuses with a 402 if it is.
      return null;
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setSubscription(null);
      return;
    }
    if (isAuthFlow(pathname)) return;
    let cancelled = false;
    api
      .getMySubscription()
      .then((next) => {
        if (cancelled) return;
        setSubscription(next);
        if (next.enforced && !next.allowed && !isOpenWithoutAccess(pathname)) {
          router.replace(SUBSCRIPTION_EXPIRED_PATH);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, pathname, router]);

  return <SubscriptionContext.Provider value={{ subscription, refresh }}>{children}</SubscriptionContext.Provider>;
}
