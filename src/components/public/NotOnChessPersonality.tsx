"use client";

import { usePathname } from "next/navigation";

/** True on the chess personality test's pages, which point nowhere else: no Get started, no Log in. */
export function useOnChessPersonality(): boolean {
  return usePathname().startsWith("/chess-personality");
}

/** Its children everywhere except the chess personality test. For server components such as the footer. */
export function NotOnChessPersonality({ children }: { children: React.ReactNode }) {
  return useOnChessPersonality() ? null : <>{children}</>;
}
