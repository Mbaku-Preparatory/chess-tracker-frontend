"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { hasInAppHistory } from "@/components/NavigationMemory";

/**
 * Every "‹ Back" button looks like this: the accent outline that fills on
 * hover. One place, so they stay the same (founder, 2026-11-14: "always
 * uniformity"). Add the display yourself: "inline-flex", or
 * "hidden sm:inline-flex" where a phone has its own way back.
 */
export const BACK_BUTTON =
  "shrink-0 items-center gap-1.5 rounded-pill border-2 border-accent px-3.5 py-1.5 text-[14px] font-[520] text-accent-soft hover:bg-accent hover:text-accent-on";

/** The arrow and the word, for a Back that is a <button> or a plain <Link>. */
export function BackLabel() {
  return (
    <>
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </>
  );
}

/**
 * Back that returns to where they were. Opened from inside the site, it is the
 * browser's back, so the page they came from comes back as it was (a list
 * where it was scrolled to). Landed on directly (a search result, a shared
 * link), "back" would leave the site, so it goes to `href` instead.
 */
export function BackLink({ href, hideOnPhone = false }: { href: string; hideOnPhone?: boolean }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (hasInAppHistory()) {
          e.preventDefault();
          router.back();
        }
      }}
      className={`${hideOnPhone ? "hidden sm:inline-flex" : "inline-flex"} ${BACK_BUTTON}`}
    >
      <BackLabel />
    </Link>
  );
}
