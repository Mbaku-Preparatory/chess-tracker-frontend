"use client";

import { usePathname } from "next/navigation";

/**
 * The just-for-fun pages: the chess personality test and Guess the player.
 * They point nowhere else, so no Get started, Log in or Open app on them:
 * their only job is to be enjoyed (and to keep people on the site).
 */
const FUN_PAGES = ["/chess-personality", "/guess-the-player"];

export function useOnFunPage(): boolean {
  const pathname = usePathname();
  return FUN_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Its children everywhere except the fun pages. For server components such as the footer. */
export function NotOnFunPage({ children }: { children: React.ReactNode }) {
  return useOnFunPage() ? null : <>{children}</>;
}
