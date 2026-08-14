"use client";

/**
 * The tip flow: pick an amount, pay on Paystack, come back.
 *
 * Shape shared with the mobile app's TipSection, deliberately — one product,
 * one flow, so a change of mind about amounts or copy is made in two obvious
 * places rather than reasoned about twice.
 *
 * The design problem is that the middle of this flow does not happen here. The
 * payer leaves for Paystack's page, chooses M-Pesa or a card, and is sent back
 * with `?reference=` on the URL. So this component is really two screens: the
 * form, and whatever the payment turned out to be. Neither knows what happened
 * on the other side — the backend does, which is why the return screen asks it
 * rather than trusting the query string. Anyone can type `?reference=` and a
 * success message that believed the URL would be a lie.
 */

import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";

const PRESETS = [100, 250, 500, 1000];
const MIN = 50;
const MAX = 10_000;

const CARD =
  "rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-border dark:bg-dark-surface";

export function TipForm({ returnedReference }: { returnedReference: string | null }) {
  const [amount, setAmount] = useState<number>(250);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const { payment, state } = usePaymentStatus(returnedReference);

  const effectiveAmount = custom.trim() ? Number(custom) : amount;
  const amountValid =
    Number.isInteger(effectiveAmount) && effectiveAmount >= MIN && effectiveAmount <= MAX;

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!amountValid || leaving) return;
      setError(null);
      setLeaving(true);
      try {
        const created = await api.createTip(effectiveAmount);
        // Same tab, not a popup: a blocked popup is indistinguishable from a
        // broken button, and this is the one click in the app that must not
        // silently do nothing.
        window.location.assign(created.authorization_url);
      } catch (err) {
        setError(userMessage(err, "Couldn't start the payment. Please try again."));
        setLeaving(false);
      }
    },
    [amountValid, leaving, effectiveAmount]
  );

  // ── Coming back from Paystack ──────────────────────────────────────────────

  if (returnedReference) {
    if (state === "polling") {
      return (
        <div className={`${CARD} text-center`}>
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-600 dark:border-dark-border dark:border-t-brand-400" />
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Confirming your payment
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            This usually takes a few seconds.
          </p>
        </div>
      );
    }

    if (state === "settled" && payment) {
      const ok = payment.status === "completed";
      return (
        <div
          className={`rounded-xl border p-6 text-center ${
            ok
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
              : "border-gray-200 bg-white dark:border-dark-border dark:bg-dark-surface"
          }`}
        >
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {ok ? "Thank you." : "That payment didn't go through"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-300">
            {ok ? (
              <>
                Your {payment.currency} {payment.amount} went through. It genuinely
                helps — this is a one-person project.
              </>
            ) : (
              // Our sentence, derived from the payment's status on our side.
              // Paystack's own wording never reaches this line.
              payment.failure_reason ?? "No money was taken."
            )}
          </p>
          <a
            href="/support"
            className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            {ok ? "Send another" : "Try again"}
          </a>
        </div>
      );
    }

    // Gave up, or settled with nothing to show. Honest rather than hopeful:
    // the payment may well have succeeded, and the receipt is the thing that
    // actually answers the question.
    return (
      <div className={`${CARD} text-center`}>
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
          We&apos;re still waiting to hear back
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-300">
          If you completed the payment, it will have gone through — Paystack emails
          a receipt. Nothing is charged twice by refreshing this page.
        </p>
        <a
          href="/support"
          className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Back
        </a>
      </div>
    );
  }

  // ── The form ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={submit} className={CARD}>
      <fieldset disabled={leaving}>
        <legend className="sr-only">Choose an amount</legend>

        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((preset) => {
            const selected = !custom.trim() && amount === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmount(preset);
                  setCustom("");
                }}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-dark-border dark:text-gray-300 dark:hover:bg-dark-elevated"
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>

        <label
          htmlFor="tip-custom"
          className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Or another amount (KES)
        </label>
        <input
          id="tip-custom"
          type="number"
          inputMode="numeric"
          min={MIN}
          max={MAX}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={`${MIN}–${MAX.toLocaleString()}`}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100"
        />

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={!amountValid || leaving} className="btn-primary mt-4 w-full">
          {leaving
            ? "Taking you to Paystack…"
            : `Continue to payment · KES ${amountValid ? effectiveAmount.toLocaleString() : "—"}`}
        </button>

        <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          Paystack handles the payment — M-Pesa or card. We never see your card or
          PIN.
        </p>
      </fieldset>
    </form>
  );
}
