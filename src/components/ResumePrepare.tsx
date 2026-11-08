"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { preparePath, takePendingPrepare } from "@/lib/prepare";
import { useAppSelector } from "@/redux/hooks";

/**
 * The player somebody asked to prepare against before they had an account
 * (lib/prepare.ts), opened the moment they are signed in. Every sign-in lands
 * on /home, so that is the only place it fires: anywhere else would take over
 * a page the user chose.
 *
 * Keyed on the token, not run once on mount like ClaimGuestBook: signing up
 * and signing in are client-side navigations inside this same layout, so a
 * mount-only effect has already run, signed out, by the time they are in.
 */
export function ResumePrepare() {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAppSelector((s) => s.auth.token);

  useEffect(() => {
    if (!token || pathname !== "/home") return;
    const player = takePendingPrepare();
    if (player) router.replace(preparePath(player));
  }, [token, pathname, router]);

  return null;
}
