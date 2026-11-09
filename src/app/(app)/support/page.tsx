"use client";

/**
 * Support the project.
 *
 * This route is also Paystack's callback URL (PAYSTACK_CALLBACK_URL on the
 * backend), so it is where the payer lands on the way back with
 * `?reference=…&trxref=…` appended. Both name the same transaction; `reference`
 * is the one we asked for, `trxref` is Paystack's legacy alias for it, and
 * reading either means a stray link with only the old parameter still works.
 *
 * The reference from the URL is used only to ask our own backend what
 * happened. It is never evidence of anything by itself — anyone can type one.
 *
 * Tips close when the paywall opens (SUBSCRIPTIONS_ENFORCED): the menu stops
 * linking here and the page points to /subscribe instead. A payer coming back
 * from Paystack with a reference still sees what became of their tip.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import Link from "next/link";

import { TipForm } from "@/components/TipForm";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { SUBSCRIBE_PATH } from "@/lib/subscription";

function Support() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const { subscription } = useSubscription();

  if (!reference && !subscription) {
    return <div className="mx-auto max-w-lg px-4 py-10"><div className="card h-48 animate-pulse" /></div>;
  }

  if (!reference && subscription?.enforced) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Support Chess Preparatory</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          Thank you for wanting to help. We no longer take tips: the best way to support the project now is a
          subscription.
        </p>
        <Link href={SUBSCRIBE_PATH} className="btn-primary mt-6">See the plans</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Buy the developer a coffee
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        Chess Preparatory is built and paid for by one person. A tip is on top of
        any subscription and buys nothing extra, which is rather the point. It
        just keeps the servers on.
      </p>

      <div className="mt-6">
        <TipForm returnedReference={reference} />
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense>
      <Support />
    </Suspense>
  );
}
