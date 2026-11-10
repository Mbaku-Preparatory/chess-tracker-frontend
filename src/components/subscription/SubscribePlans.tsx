"use client";

/**
 * Choosing a plan and paying for it. The body of both /subscribe (anyone who
 * wants to pay, early or not) and /subscription-expired (where the paywall
 * sends people).
 *
 * Paying leaves the app, like a tip does (components/TipForm.tsx): Paystack's
 * page takes the M-Pesa PIN or the card, then sends the payer back to
 * /subscribe?reference=…. The reference in the URL proves nothing by itself;
 * the backend is asked what became of it, and access is whatever the backend
 * then says (GET /api/subscriptions/me/).
 *
 * `expired`: the page keeps asking whether they have access yet (every few
 * seconds while it is open, on returning to the tab, and on "I've paid") and
 * sends them home the moment they do. That covers a payment finished on a
 * phone, or recorded by hand in the sales panel, as well as one made here.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { POPULAR_LABEL, POPULAR_PERIOD, usePlanHighlight } from "@/hooks/usePlanHighlight";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { annualSaving, formatDate, formatPrice, perMonthOfAnnual } from "@/lib/subscription";
import { HELP_PATH, helpHref } from "@/lib/support";
import type { MySubscription, SubscriptionPlan } from "@/types";

const RECHECK_MS = 10_000;

function saving(plans: SubscriptionPlan[], annual: SubscriptionPlan): number | null {
  const monthly = plans.find((p) => p.period === "month");
  return monthly ? annualSaving(monthly.price, annual.price) : null;
}

function StatusLine({ sub }: { sub: MySubscription }) {
  if (sub.state === "staff") return <>You have staff access.</>;
  if (sub.state === "trial") {
    return <>Your free trial runs until <strong>{formatDate(sub.access_until)}</strong>.</>;
  }
  if (sub.state === "paid" || sub.state === "negotiated") {
    return (
      <>
        You have access until <strong>{formatDate(sub.access_until)}</strong>. Paying now adds the time on after that.
      </>
    );
  }
  if (sub.paid_until) return <>Your access ended on <strong>{formatDate(sub.paid_until)}</strong>.</>;
  return null;
}

function PlanCard({
  plan,
  plans,
  onChoose,
  busy,
  highlighted,
  ...hover
}: {
  plan: SubscriptionPlan;
  plans: SubscriptionPlan[];
  onChoose: (code: string) => void;
  busy: string | null;
  highlighted: boolean;
  onMouseEnter: () => void;
  onFocus: () => void;
}) {
  const annual = plan.period === "year";
  const pct = annual ? saving(plans, plan) : null;
  const perMonth = annual ? perMonthOfAnnual(plan.price, plan.currency) : null;
  return (
    <div
      {...hover}
      className={`card relative flex flex-col p-6 transition-shadow ${highlighted ? "border-brand-400 ring-1 ring-brand-400 dark:border-brand-600 dark:ring-brand-600" : ""}`}
    >
      {plan.period === POPULAR_PERIOD && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white dark:bg-brand-500">
          {POPULAR_LABEL}
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{annual ? "Annual" : "Monthly"}</h3>
        {pct !== null && (
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
            Save {pct}%
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">
        {formatPrice(plan.price, plan.currency)}
        <span className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">/ {annual ? "year" : "month"}</span>
      </p>
      {plan.negotiated && plan.list_price !== plan.price && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your agreed price. Usually <span className="line-through">{formatPrice(plan.list_price, plan.currency)}</span>.
        </p>
      )}
      {perMonth && !plan.negotiated && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">That&apos;s {perMonth} a month.</p>
      )}
      <p className="mt-3 flex-1 text-sm text-gray-600 dark:text-gray-300">
        {plan.days} days of everything: scouting, prep, the player bots and your books.
      </p>
      <button
        type="button"
        onClick={() => onChoose(plan.code)}
        disabled={busy !== null}
        className={`${highlighted ? "btn-primary" : "btn-secondary"} mt-5 w-full disabled:opacity-60`}
      >
        {busy === plan.code ? "Opening Paystack…" : `Pay ${formatPrice(plan.price, plan.currency)}`}
      </button>
    </div>
  );
}

export function SubscribePlans({ expired, returnedReference }: { expired: boolean; returnedReference: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { subscription: sub, refresh } = useSubscription();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const { payment, state } = usePaymentStatus(returnedReference);
  const goneHome = useRef(false);
  const highlight = usePlanHighlight(sub?.plans.map((p) => p.period) ?? []);

  // The first answer, in case the provider's has not arrived (or is stale).
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Back from Paystack with a payment that went through: ask again, now that
  // the backend has granted the days.
  useEffect(() => {
    if (state === "settled" && payment?.status === "completed") void refresh();
  }, [state, payment?.status, refresh]);

  // The expired page lets them in the moment they have access.
  useEffect(() => {
    if (expired && sub?.allowed && !goneHome.current) {
      goneHome.current = true;
      router.replace("/home");
    }
  }, [expired, sub?.allowed, router]);

  // …and keeps asking while it is open, and when they come back to the tab.
  useEffect(() => {
    if (!expired) return;
    const timer = setInterval(() => void refresh(), RECHECK_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [expired, refresh]);

  const choose = useCallback(async (code: string) => {
    setError(null);
    setBusy(code);
    try {
      const created = await api.startSubscriptionCheckout(code);
      // Same tab, as for tips: a blocked popup looks like a broken button.
      window.location.assign(created.authorization_url);
    } catch (err) {
      setError(userMessage(err, "Couldn't start the payment. Please try again."));
      setBusy(null);
    }
  }, []);

  const iHavePaid = useCallback(async () => {
    setChecking(true);
    setNotYet(false);
    const next = await refresh();
    setChecking(false);
    if (next && !next.allowed) setNotYet(true);
  }, [refresh]);

  // ── Coming back from Paystack ──────────────────────────────────────────────

  if (returnedReference && state === "polling") {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-600 dark:border-dark-border dark:border-t-brand-400" />
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">Confirming your payment</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">This usually takes a few seconds.</p>
      </div>
    );
  }

  const paidNow = returnedReference && state === "settled" && payment?.status === "completed";
  const failedNow = returnedReference && state === "settled" && payment && payment.status !== "completed";

  if (paidNow) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">You&apos;re subscribed. Thank you.</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-300">
          {sub?.access_until
            ? <>Your {payment.currency} {payment.amount} went through. You have access until {formatDate(sub.access_until)}.</>
            : <>Your {payment.currency} {payment.amount} went through.</>}
        </p>
        <a href="/home" className="btn-primary mt-5">Go to the app</a>
      </div>
    );
  }

  // ── Choosing a plan ────────────────────────────────────────────────────────

  if (!sub) {
    return <div className="card h-64 animate-pulse" />;
  }

  return (
    <div className="flex flex-col gap-6">
      {failedNow && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {payment.failure_reason ?? "That payment didn't go through. No money was taken."} You can try again below.
        </p>
      )}
      {returnedReference && (state === "gave-up" || state === "unavailable") && (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-dark-border dark:bg-dark-surface dark:text-gray-300">
          We&apos;re still waiting to hear from Paystack. If you completed the payment, your access will appear here
          shortly, and Paystack has emailed you a receipt.
        </p>
      )}

      <p className="text-sm text-gray-600 dark:text-gray-300">
        <StatusLine sub={sub} />
      </p>

      {sub.plans.length === 0 ? (
        <div className="card p-6 text-sm text-gray-600 dark:text-gray-300">
          Subscriptions aren&apos;t on sale just yet. Check back soon, or <Link href={helpHref(pathname)} className="font-medium text-brand-600 hover:underline dark:text-brand-400">ask us</Link>.
        </div>
      ) : (
        <div {...highlight.gridProps} className="grid gap-4 pt-3 sm:grid-cols-2">
          {sub.plans.map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              plans={sub.plans}
              onChoose={choose}
              busy={busy}
              highlighted={highlight.isHighlighted(plan.period)}
              {...highlight.cardProps(plan.period)}
            />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
        <p>
          {sub.currency === "KES"
            ? "Pay with M-Pesa or a card. Payments are handled by Paystack."
            : "Pay by card. Payments are handled by Paystack."}{" "}
          Nothing renews automatically: when your time runs out, you choose whether to pay again.{" "}
          <Link href={`${HELP_PATH}#refunds`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">Refunds</Link>
          {" · "}
          <Link href={helpHref(pathname)} className="font-medium text-brand-600 hover:underline dark:text-brand-400">A payment that hasn&apos;t arrived</Link>
        </p>
        {expired && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={iHavePaid} disabled={checking} className="btn-secondary disabled:opacity-60">
              {checking ? "Checking…" : "I've already paid"}
            </button>
            {notYet && (
              <span role="status">
                We haven&apos;t received it yet. M-Pesa can take a minute; this page checks again by itself.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
