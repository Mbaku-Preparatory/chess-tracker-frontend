"use client";

/**
 * One line under the navbar while someone is on their free trial, or in the
 * last three days of paid time: how long is left, and where to pay. Nothing
 * while the paywall is off, so the app looks exactly as before until launch.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { useLocale, useT, type Translate } from "@/hooks/useT";
import { formatDate, isOpenWithoutAccess, SUBSCRIBE_PATH } from "@/lib/subscription";

const LAST_DAYS = 3;

function trialText(days: number, t: Translate): string {
  if (days <= 0) return t("Free trial: less than a day left.");
  return t.plural(days, "Free trial: {n} day left.", "Free trial: {n} days left.");
}

export function SubscriptionBanner() {
  const pathname = usePathname();
  const { subscription: sub } = useSubscription();
  const t = useT();
  const locale = useLocale();

  if (!sub || !sub.enforced || !sub.allowed || isOpenWithoutAccess(pathname)) return null;

  let text: string;
  if (sub.state === "trial") {
    text = trialText(sub.days_left, t);
  } else if ((sub.state === "paid" || sub.state === "negotiated") && sub.days_left < LAST_DAYS) {
    text = t("Your access ends on {date}.", { date: formatDate(sub.access_until, locale) });
  } else {
    return null;
  }

  return (
    <div className="border-b border-brand-200 bg-brand-50 dark:border-brand-900/50 dark:bg-brand-950/30">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-sm text-brand-800 sm:px-6 lg:px-8 dark:text-brand-200">
        <span>{text}</span>
        <Link href={SUBSCRIBE_PATH} className="font-semibold underline underline-offset-2">
          {sub.state === "trial" ? t("Subscribe") : t("Renew")}
        </Link>
      </div>
    </div>
  );
}
