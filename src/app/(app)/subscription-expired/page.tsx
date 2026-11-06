"use client";

/**
 * Where the paywall sends a signed-in user whose trial or subscription has
 * run out (components/subscription/SubscriptionProvider.tsx, and any 402 from
 * the API). It keeps checking whether they have paid and sends them home as
 * soon as they have, however the payment arrived.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { SubscribePlans } from "@/components/subscription/SubscribePlans";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";

function Expired() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const { subscription } = useSubscription();
  const hadTrialOnly = subscription?.state === "none" && !subscription?.negotiated_until;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {hadTrialOnly ? "Your access has ended" : "Your subscription has ended"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        Everything you added is still saved: your players, games, prep and books. Subscribe and it&apos;s all back
        the moment the payment goes through.
      </p>
      <div className="mt-6">
        <SubscribePlans expired returnedReference={reference} />
      </div>
    </div>
  );
}

export default function SubscriptionExpiredPage() {
  return (
    <Suspense>
      <Expired />
    </Suspense>
  );
}
