import type { Metadata } from "next";

import { TipForm } from "@/components/TipForm";

export const metadata: Metadata = {
  title: "Support — Mbaku Preparatory",
  description: "Buy the developer a coffee and keep Mbaku Preparatory running.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Buy the developer a coffee
      </h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        Mbaku Preparatory is built and paid for by one person in Nairobi. Servers,
        the database, and the tournament imports all cost money whether anyone tips
        or not — so this is genuinely optional, and nothing in the app is locked
        behind it.
      </p>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        If it has saved you an evening of prep, a coffee is a kind way to say so.
      </p>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-border dark:bg-dark-surface">
        <TipForm />
      </div>

      <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
        Payments are handled by Safaricom M-Pesa. We never see or store your PIN —
        only the amount, the number the prompt was sent to, and Safaricom&apos;s
        receipt.
      </p>
    </div>
  );
}
