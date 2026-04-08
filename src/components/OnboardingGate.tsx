"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadRepertoireFromStorage } from "@/store/slices/repertoireSlice";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { onboardingComplete, initialized } = useAppSelector(
    (s) => s.repertoire
  );

  // Load localStorage into Redux once, client-side only.
  useEffect(() => {
    dispatch(loadRepertoireFromStorage());
  }, [dispatch]);

  // Redirect uninitialized users to /setup — but only after we've read
  // localStorage so we don't incorrectly redirect returning users.
  useEffect(() => {
    if (!initialized) return;
    if (!onboardingComplete && pathname !== "/setup") {
      router.replace("/setup");
    }
  }, [initialized, onboardingComplete, pathname, router]);

  return <>{children}</>;
}
