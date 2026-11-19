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
import { useLocale, useT, type Translate } from "@/hooks/useT";
import { userMessage } from "@/lib/apiError";
import { msg } from "@/lib/i18n";
import { formatDate, formatPrice, formatShortDate, SUBSCRIBE_PATH } from "@/lib/subscription";
import type { Billing, BillingEntry, MySubscription } from "@/types";

const PER = { month: msg("{price} a month"), year: msg("{price} a year") } as const;

function StatusBadge({ sub }: { sub: MySubscription }) {
  const t = useT();
  const [text, tone] =
    sub.state === "trial" ? [msg("Free trial"), "brand"]
      : sub.state === "paid" ? [msg("Active"), "brand"]
        : sub.state === "negotiated" ? [msg("Active, agreed terms"), "brand"]
          : sub.state === "staff" ? [msg("Staff"), "gray"]
            : sub.state === "tester" ? [msg("Tester"), "gray"]
              : [msg("Expired"), "red"];
  const colours = {
    brand: "bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-900/30 dark:text-brand-300",
    gray: "bg-gray-100 text-gray-700 ring-gray-500/20 dark:bg-dark-elevated dark:text-gray-300",
    red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-300",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${colours}`}>{t(text)}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 sm:text-right dark:text-gray-100">{children}</dd>
    </div>
  );
}

function planName(entry: BillingEntry | null, sub: MySubscription, t: Translate): string {
  // Plan names already say the period ("Pro, monthly"); they are the backend's, shown as they are.
  if (entry?.plan) return entry.plan;
  if (entry) return t("Paid");
  if (sub.state === "trial") return t("Free trial");
  if (sub.state === "negotiated") return t("Agreed with us");
  return t("None");
}

/** The date the time they have runs out, worded for where they stand. */
function dueRow(sub: MySubscription, t: Translate, locale: string): { label: string; value: string } {
  const when = formatDate(sub.access_until, locale);
  const left = t.plural(sub.days_left, "{n} day left", "{n} days left");
  const dated = `${when} (${left})`;
  switch (sub.state) {
    case "trial":
      return { label: t("Trial ends"), value: dated };
    case "paid":
      return { label: t("Next payment due"), value: dated };
    case "negotiated":
      return { label: t("Pay by"), value: dated };
    case "staff":
      return { label: t("Next payment due"), value: t("Never: staff access") };
    case "tester":
      return { label: t("Next payment due"), value: t("Never: tester access") };
    default:
      return sub.access_until
        ? { label: t("Access ended"), value: when }
        : { label: t("Next payment due"), value: t("Now") };
  }
}

/** "$0.99 a month · $9.99 a year": what they would pay today. */
function priceText(sub: MySubscription, t: Translate): string {
  return sub.plans.map((p) => t(PER[p.period], { price: formatPrice(p.price, p.currency) })).join(" · ");
}

function entryTitle(e: BillingEntry, t: Translate): string {
  if (e.kind === "trial") return t("Free trial");
  if (e.kind === "free") return t("Free time from us");
  return e.plan ?? t("Payment");
}

function History({ entries }: { entries: BillingEntry[] }) {
  const t = useT();
  const locale = useLocale();
  const short = (iso: string | null) => formatShortDate(iso, locale);
  if (entries.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t("Nothing yet.")}</p>;
  }
  return (
    <ul className="divide-y divide-gray-100 dark:divide-dark-border">
      {entries.map((e, i) => (
        <li key={`${e.given_at}-${i}`} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{entryTitle(e, t)}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {short(e.given_at)}
              {e.starts_at && e.ends_at && <> · {t("covers {from} to {to}", { from: short(e.starts_at), to: short(e.ends_at) })}</>}
            </p>
            {e.reference && <p className="mt-0.5 break-all font-mono text-xs text-gray-500 dark:text-gray-400">{e.reference}</p>}
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {e.kind === "payment" ? formatPrice(e.amount, e.currency) : t("Free")}
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
  const t = useT();
  const locale = useLocale();

  useEffect(() => {
    void refresh();
    api.getBilling().then(setBilling).catch((e) => setError(userMessage(e)));
  }, [refresh]);

  const due = sub ? dueRow(sub, t, locale) : null;
  const button =
    !sub || sub.state === "staff" || sub.state === "tester" ? null
      : sub.state === "paid" || sub.state === "negotiated" ? t("Renew or add time")
        : t("Subscribe");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("Billing")} subtitle={t("Your plan, when the next payment is due, and what you have paid.")} />

      <div className="flex flex-col gap-6">
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("Subscription")}</h2>
            {sub && sub.enforced && <StatusBadge sub={sub} />}
          </div>

          {!sub ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t("Loading…")}</p>
          ) : !sub.enforced ? (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{t("Chess Preparatory is free for now. There is nothing to pay.")}</p>
          ) : (
            <>
              <dl className="mt-3 divide-y divide-gray-100 dark:divide-dark-border">
                <Row label={t("Current plan")}>{planName(billing?.current_plan ?? null, sub, t)}</Row>
                {billing?.current_plan && (
                  <Row label={t("Last payment")}>
                    {t("{amount} on {date}", {
                      amount: formatPrice(billing.current_plan.amount, billing.current_plan.currency),
                      date: formatShortDate(billing.current_plan.given_at, locale),
                    })}
                  </Row>
                )}
                {due && <Row label={due.label}>{due.value}</Row>}
                {sub.state !== "staff" && sub.state !== "tester" && sub.plans.length > 0 && <Row label={t("Your price")}>{priceText(sub, t)}</Row>}
              </dl>

              {button && (
                <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-dark-border">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {sub.currency === "KES"
                      ? t("Nothing renews by itself. Pay ahead with M‑Pesa or a card whenever you want more time.")
                      : t("Nothing renews by itself. Pay ahead by card whenever you want more time.")}
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("Payments and free time")}</h2>
          <div className="mt-4">
            {error ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">{t(error)}</p>
            ) : billing ? (
              <History entries={billing.history} />
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("Loading…")}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
