"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { hasInAppHistory } from "@/components/NavigationMemory";

/**
 * "‹ Back", in the signed-in app's style. Opened from inside the site, it is
 * the browser's back, so the page they came from comes back as it was. Landed
 * on directly, it goes to `href` rather than off the site (the same rule as
 * the analysis board's Back button).
 */
export function BackLink({ href }: { href: string }) {
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
      className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </Link>
  );
}
