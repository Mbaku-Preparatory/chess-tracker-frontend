"use client";

/**
 * Billing: where the subscription stands, when the next payment is due, the
 * price, and every payment and free period so far, with the way to pay at the
 * top. Open without access (lib/subscription.ts), so somebody whose time ran
 * out can still see what they paid and when it ended.
 *
 * Nothing renews by itself: access is paid ahead (subscriptions/services.py),
 * so "next payment" is the day the time they have runs out.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { formatDate, formatPrice, formatShortDate, SUBSCRIBE_PATH } from "@/lib/subscription";
import type { Billing, BillingEntry, MySubscription } from "@/types";

const PER = { month: "month", year: "year" } as const;

function StatusBadge({ sub }: { sub: MySubscription }) {
  const [text, tone] =
    sub.state === "trial" ? ["Free trial", "brand"]
      : sub.state === "paid" ? ["Active", "brand"]
        : sub.state === "negotiated" ? ["Active, agreed terms", "brand"]
          : sub.state === "staff" ? ["Staff", "gray"]
            : ["Expired", "red"];
  const colours = {
    brand: "bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-900/30 dark:text-brand-300",
    gray: "bg-gray-100 text-gray-700 ring-gray-500/20 dark:bg-dark-elevated dark:text-gray-300",
    red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-300",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${colours}`}>{text}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 sm:text-right dark:text-gray-100">{children}</dd>
    </div>
  );
}

function planName(entry: BillingEntry | null, sub: MySubscription): string {
  // Plan names already say the period ("Pro, monthly").
  if (entry?.plan) return entry.plan;
  if (entry) return "Paid";
  if (sub.state === "trial") return "Free trial";
  if (sub.state === "negotiated") return "Agreed with us";
  return "None";
}

/** The date the time they have runs out, worded for where they stand. */
function dueRow(sub: MySubscription): { label: string; value: string } {
  const when = formatDate(sub.access_until);
  const left = sub.days_left === 1 ? "1 day left" : `${sub.days_left} days left`;
  switch (sub.state) {
    case "trial":
      return { label: "Trial ends", value: `${when} (${left})` };
    case "paid":
      return { label: "Next payment due", value: `${when} (${left})` };
    case "negotiated":
      return { label: "Pay by", value: `${when} (${left})` };
    case "staff":
      return { label: "Next payment due", value: "Never: staff access" };
    default:
      return sub.access_until
        ? { label: "Access ended", value: formatDate(sub.access_until) }
        : { label: "Next payment due", value: "Now" };
  }
}

/** "$0.99 a month · $9.99 a year": what they would pay today. */
function priceText(sub: MySubscription): string {
  return sub.plans.map((p) => `${formatPrice(p.price, p.currency)} a ${PER[p.period]}`).join(" · ");
}

function entryTitle(e: BillingEntry): string {
  if (e.kind === "trial") return "Free trial";
  if (e.kind === "free") return "Free time from us";
  return e.plan ?? "Payment";
}

function History({ entries }: { entries: BillingEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Nothing yet.</p>;
  }
  return (
    <ul className="divide-y divide-gray-100 dark:divide-dark-border">
      {entries.map((e, i) => (
        <li key={`${e.given_at}-${i}`} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{entryTitle(e)}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {formatShortDate(e.given_at)}
              {e.starts_at && e.ends_at && <> · covers {formatShortDate(e.starts_at)} to {formatShortDate(e.ends_at)}</>}
            </p>
            {e.reference && <p className="mt-0.5 break-all font-mono text-xs text-gray-500 dark:text-gray-400">{e.reference}</p>}
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {e.kind === "payment" ? formatPrice(e.amount, e.currency) : "Free"}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function BillingPage() {
  const { subscription: sub, refresh } = useSubscription();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    api.getBilling().then(setBilling).catch((e) => setError(userMessage(e)));
  }, [refresh]);

  const due = sub ? dueRow(sub) : null;
  const button =
    !sub || sub.state === "staff" ? null
      : sub.state === "paid" || sub.state === "negotiated" ? "Renew or add time"
        : "Subscribe";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Billing" subtitle="Your plan, when the next payment is due, and what you have paid." />

      <div className="flex flex-col gap-6">
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Subscription</h2>
            {sub && sub.enforced && <StatusBadge sub={sub} />}
          </div>

          {!sub ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : !sub.enforced ? (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Chess Preparatory is free for now. There is nothing to pay.</p>
          ) : (
            <>
              <dl className="mt-3 divide-y divide-gray-100 dark:divide-dark-border">
                <Row label="Current plan">{planName(billing?.current_plan ?? null, sub)}</Row>
                {billing?.current_plan && (
                  <Row label="Last payment">
                    {formatPrice(billing.current_plan.amount, billing.current_plan.currency)} on {formatShortDate(billing.current_plan.given_at)}
                  </Row>
                )}
                {due && <Row label={due.label}>{due.value}</Row>}
                {sub.state !== "staff" && sub.plans.length > 0 && <Row label="Your price">{priceText(sub)}</Row>}
              </dl>

              {button && (
                <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-dark-border">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nothing renews by itself. Pay ahead {sub.currency === "KES" ? "with M‑Pesa or a card" : "by card"} whenever you want more time.
                  </p>
                  <Link href={SUBSCRIBE_PATH} className="btn-primary shrink-0 justify-center text-center">
                    {button}
                  </Link>
                </div>
              )}
            </>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payments and free time</h2>
          <div className="mt-4">
            {error ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : billing ? (
              <History entries={billing.history} />
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
