"use client";

import Link from "next/link";

import { AuthLink } from "@/components/public/AuthLink";
import { useSignedIn } from "@/hooks/useSignedIn";
import { SUBSCRIBE_PATH } from "@/lib/subscription";

/**
 * The pricing page's button: start the free trial, or, for someone already
 * signed in, go and pay (/subscribe shows their own price and status).
 *
 * Signed-out first, as the server rendered it, then swaps once the client has
 * looked: see AccountLinks.tsx.
 */
export function PricingCta({ primary, className = "" }: { primary: boolean; className?: string }) {
  const signedIn = useSignedIn() === true;
  const look = primary
    ? "bg-accent text-accent-on hover:bg-accent-soft font-[480]"
    : "border border-ink-text/80 text-ink-text hover:bg-ink-raised";
  const classes = `inline-flex w-full items-center justify-center whitespace-nowrap rounded-pill px-6 py-3 text-[16px] ${look} ${className}`;

  if (signedIn) {
    return (
      <Link href={SUBSCRIBE_PATH} className={classes}>
        Subscribe
      </Link>
    );
  }
  return (
    <AuthLink href="/signup" className={classes}>
      Start a free trial
    </AuthLink>
  );
}
