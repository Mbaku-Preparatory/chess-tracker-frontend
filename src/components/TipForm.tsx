"use client";

/**
 * The tip flow, shared shape on both platforms: pick an amount, give a phone
 * number, answer the prompt.
 *
 * The waiting state is the whole design problem. Between submitting and the
 * M-Pesa prompt resolving there are up to sixty seconds in which nothing this
 * app controls is happening — the user is looking at their own handset, not at
 * us. So the copy points at the phone, and the polling is bounded: an STK
 * prompt expires, and a spinner that never stops is worse than an honest
 * "we stopped checking".
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import type { Payment } from "@/types";

const PRESETS = [100, 250, 500, 1000];
const MIN = 50;
const MAX = 10_000;

const POLL_INTERVAL_MS = 3000;
// Safaricom expires an unanswered prompt after about a minute. Two minutes
// covers a slow phone and a slow human, and stops well before "forever".
const POLL_CEILING_MS = 120_000;

type Phase =
  | { name: "form" }
  | { name: "waiting"; payment: Payment }
  | { name: "settled"; payment: Payment }
  | { name: "gave-up"; payment: Payment };

export function TipForm() {
  const [amount, setAmount] = useState<number>(250);
  const [custom, setCustom] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: "form" });

  const startedAt = useRef<number>(0);
  const pollingId = phase.name === "waiting" ? phase.payment.id : null;

  const effectiveAmount = custom.trim() ? Number(custom) : amount;
  const amountValid =
    Number.isInteger(effectiveAmount) && effectiveAmount >= MIN && effectiveAmount <= MAX;

  // ── Poll until the prompt is answered, or until we stop believing in it ────
  useEffect(() => {
    if (!pollingId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const payment = await api.getPayment(pollingId);
        if (cancelled) return;
        if (payment.status !== "pending") {
          setPhase({ name: "settled", payment });
          return;
        }
        if (Date.now() - startedAt.current > POLL_CEILING_MS) {
          setPhase({ name: "gave-up", payment });
          return;
        }
      } catch {
        // A dropped poll says nothing about the payment — it is being decided
        // on Safaricom's side either way. Keep asking until the ceiling.
        if (Date.now() - startedAt.current > POLL_CEILING_MS) return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pollingId]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!amountValid || !phone.trim() || submitting) return;
      setError(null);
      setSubmitting(true);
      try {
        const payment = await api.createTip(phone.trim(), effectiveAmount);
        startedAt.current = Date.now();
        setPhase({ name: "waiting", payment });
      } catch (err) {
        setError(userMessage(err, "Couldn't start the payment. Please try again."));
      } finally {
        setSubmitting(false);
      }
    },
    [amountValid, phone, submitting, effectiveAmount]
  );

  function reset() {
    setPhase({ name: "form" });
    setError(null);
    setCustom("");
  }

  // ── Waiting ────────────────────────────────────────────────────────────────

  if (phase.name === "waiting") {
    return (
      <div className="rounded-xl border border-[#1a3a6b]/30 bg-white p-6 text-center dark:border-blue-900/50 dark:bg-dark-surface">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#1a3a6b] dark:border-dark-border dark:border-t-blue-400" />
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Check your phone
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-300">
          We&apos;ve sent an M-Pesa request for{" "}
          <strong>KES {phase.payment.amount}</strong> to {phase.payment.phone_number}.
          Enter your PIN to confirm.
        </p>
        {phase.payment.reused_existing && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            You already had a request in progress, so we didn&apos;t send another one.
          </p>
        )}
      </div>
    );
  }

  // ── Settled ────────────────────────────────────────────────────────────────

  if (phase.name === "settled") {
    const ok = phase.payment.status === "completed";
    return (
      <div
        className={`rounded-xl border p-6 text-center ${
          ok
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
            : "border-gray-200 bg-white dark:border-dark-border dark:bg-dark-surface"
        }`}
      >
        <p className="text-3xl" aria-hidden="true">{ok ? "♞" : "♟"}</p>
        <p className="mt-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          {ok ? "Thank you — genuinely." : "That didn't go through"}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-300">
          {ok
            ? `KES ${phase.payment.amount} received. Receipt ${phase.payment.mpesa_receipt}.`
            : phase.payment.failure_reason}
        </p>
        <button type="button" onClick={reset} className="btn-secondary mt-4 text-sm">
          {ok ? "Send another" : "Try again"}
        </button>
      </div>
    );
  }

  // ── Gave up waiting ────────────────────────────────────────────────────────

  if (phase.name === "gave-up") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-dark-border dark:bg-dark-surface">
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Still waiting on M-Pesa
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-300">
          We&apos;ve stopped checking, but nothing is lost — if you completed the prompt,
          the payment will still be recorded. If the prompt never arrived, try again.
        </p>
        <button type="button" onClick={reset} className="btn-secondary mt-4 text-sm">
          Try again
        </button>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          How much?
        </legend>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const active = !custom.trim() && amount === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmount(preset);
                  setCustom("");
                }}
                aria-pressed={active}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-[#1a3a6b] bg-[#1a3a6b] text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-dark-border dark:bg-dark-surface dark:text-gray-200"
                }`}
              >
                KES {preset}
              </button>
            );
          })}
          <input
            type="number"
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Other"
            min={MIN}
            max={MAX}
            aria-label={`Other amount, between ${MIN} and ${MAX} shillings`}
            className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-dark-border dark:bg-dark-surface dark:text-gray-100"
          />
        </div>
        {custom.trim() && !amountValid && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Enter a whole amount between KES {MIN} and KES {MAX.toLocaleString()}.
          </p>
        )}
      </fieldset>

      <div className="space-y-1.5">
        <label
          htmlFor="tip-phone"
          className="block text-sm font-semibold text-gray-900 dark:text-gray-100"
        >
          M-Pesa number
        </label>
        <input
          id="tip-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07XX XXX XXX"
          className="block w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-dark-border dark:bg-dark-surface dark:text-gray-100"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          The prompt goes to this number. Safaricom lines only.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={!amountValid || !phone.trim() || submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-[#1a3a6b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#142d54] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Sending…" : `Send KES ${amountValid ? effectiveAmount : "—"}`}
      </button>
    </form>
  );
}
