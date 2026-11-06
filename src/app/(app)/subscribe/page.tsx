"use client";

/**
 * Subscribe, or pay ahead. Also Paystack's callback for subscription payments
 * (PAYSTACK_SUBSCRIPTION_CALLBACK_URL on the backend), so the payer lands here
 * with `?reference=…&trxref=…`; see app/(app)/support/page.tsx for why both.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { SubscribePlans } from "@/components/subscription/SubscribePlans";

function Subscribe() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Subscribe to Chess Preparatory</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        Scout your opponents, build your prep and play their bots, for as long as you need.
      </p>
      <div className="mt-6">
        <SubscribePlans expired={false} returnedReference={reference} />
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense>
      <Subscribe />
    </Suspense>
  );
}
