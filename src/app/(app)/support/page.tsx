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
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { TipForm } from "@/components/TipForm";

function Support() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Buy the developer a coffee
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        Chess Preparatory is built and paid for by one person. Everything here is
        free and stays free — tipping buys you nothing extra, which is rather the
        point. It just keeps the servers on.
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
