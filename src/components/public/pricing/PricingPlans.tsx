"use client";

import { useState } from "react";

import { PricingCta } from "@/components/public/pricing/PricingCta";
import type { PublicPlan } from "@/lib/pricing";
import { annualSaving, formatPrice, perMonthOfAnnual } from "@/lib/subscription";

function Check() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="mt-[3px] h-4 w-4 shrink-0 text-accent">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * The one plan on /pricing: what it includes, and its price with a switch
 * between paying monthly (the default) and yearly. A client component only for
 * the switch; the prices and the list arrive in the server's HTML.
 *
 * `region` says whose prices these are ("Prices for Kenya, in Kenyan shillings").
 */
export function PricingPlans({
  plans,
  features,
  region,
  trialDays,
}: {
  plans: PublicPlan[];
  features: string[];
  region: string;
  trialDays: number;
}) {
  const monthly = plans.find((p) => p.period === "month") ?? null;
  const yearly = plans.find((p) => p.period === "year") ?? null;
  const [payYearly, setPayYearly] = useState(!monthly);
  const plan = (payYearly ? yearly : monthly) ?? monthly ?? yearly;
  if (!plan) return null;
  const pct = monthly && yearly ? annualSaving(monthly.price, yearly.price) : null;
  const annual = plan.period === "year";

  return (
    <div className="grid overflow-hidden rounded-xl bg-ink-card md:grid-cols-[3fr_2fr]">
      <div className="flex flex-col gap-6 p-8 sm:p-10">
        <div className="flex flex-col gap-2">
          <h2 className="text-[24px] font-[480] leading-[1.2]">Chess Preparatory</h2>
          <p className="max-w-[46ch] text-[16px] leading-[1.5] text-ink-muted">
            Everything for scouting and preparing against your opponents, in one subscription.
          </p>
        </div>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="flex gap-3 text-[15px] leading-[1.45]">
              <Check />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* The price first on a phone, where the list would push it a screen down. */}
      <div className="order-first flex flex-col justify-center gap-5 bg-ink-raised p-8 sm:p-10 md:order-none">
        <p className="text-[14px] text-ink-muted">{region}</p>

        <p className="flex items-baseline gap-2">
          <span className="text-[48px] font-[480] leading-none tabular-nums">{formatPrice(plan.price, plan.currency)}</span>
          <span className="text-[16px] text-ink-muted">/ {annual ? "year" : "month"}</span>
        </p>
        <p className="min-h-[1.5em] text-[15px] text-ink-muted">
          {annual ? `That's ${perMonthOfAnnual(plan.price, plan.currency)} a month.` : "Pay a month at a time."}
        </p>

        {monthly && yearly && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="pay-yearly"
              type="button"
              role="switch"
              aria-checked={payYearly}
              onClick={() => setPayYearly((y) => !y)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                payYearly ? "bg-accent" : "bg-ink-line"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${payYearly ? "translate-x-[22px]" : "translate-x-[2px]"}`}
              />
            </button>
            <label htmlFor="pay-yearly" className="cursor-pointer text-[15px] text-ink-text">
              Pay yearly
            </label>
            {pct !== null && (
              <span className="rounded-pill bg-accent/15 px-3 py-1 text-[13px] font-[480] text-accent-soft">Save {pct}%</span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <PricingCta primary />
          <p className="text-center text-[13px] text-ink-faint">
            {trialDays} days free first. No card needed. Nothing renews by itself.
          </p>
        </div>
      </div>
    </div>
  );
}
