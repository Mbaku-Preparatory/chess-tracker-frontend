"use client";

import { PricingCta } from "@/components/public/pricing/PricingCta";
import { POPULAR_LABEL, POPULAR_PERIOD, usePlanHighlight } from "@/hooks/usePlanHighlight";
import type { PublicPlan } from "@/lib/pricing";
import { annualSaving, formatPrice, perMonthOfAnnual } from "@/lib/subscription";

function PlanCard({
  plan,
  plans,
  trialDays,
  highlighted,
  ...hover
}: {
  plan: PublicPlan;
  plans: PublicPlan[];
  trialDays: number;
  highlighted: boolean;
  onMouseEnter: () => void;
  onFocus: () => void;
}) {
  const annual = plan.period === "year";
  const monthly = plans.find((p) => p.period === "month");
  const pct = annual && monthly ? annualSaving(monthly.price, plan.price) : null;
  return (
    <div {...hover} className={`relative flex flex-col gap-4 rounded-xl bg-ink-card p-8 transition-shadow ${highlighted ? "ring-1 ring-accent" : ""}`}>
      {plan.period === POPULAR_PERIOD && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-pill bg-accent px-3 py-1 text-[13px] font-[480] text-accent-on">
          {POPULAR_LABEL}
        </span>
      )}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[21px] font-[480]">{annual ? "Yearly" : "Monthly"}</h3>
        {pct !== null && (
          <span className="rounded-pill bg-accent/15 px-3 py-1 text-[13px] font-[480] text-accent-soft">Save {pct}%</span>
        )}
      </div>
      <p className="flex items-baseline gap-2">
        <span className="text-[42px] font-[480] leading-none tabular-nums">{formatPrice(plan.price, plan.currency)}</span>
        <span className="text-[16px] text-ink-muted">/ {annual ? "year" : "month"}</span>
      </p>
      <p className="min-h-[1.5em] text-[15px] text-ink-muted">
        {annual ? `That's ${perMonthOfAnnual(plan.price, plan.currency)} a month.` : "Pay a month at a time."}
      </p>
      <div className="mt-auto flex flex-col gap-2 pt-2">
        <PricingCta primary={highlighted} />
        <p className="text-center text-[13px] text-ink-faint">{trialDays} days free first. No card needed.</p>
      </div>
    </div>
  );
}

/** The plan cards on /pricing. A client component only for the highlight that
 * follows the pointer (hooks/usePlanHighlight.ts); the prices arrive in the
 * server's HTML. */
export function PricingPlans({ plans, trialDays }: { plans: PublicPlan[]; trialDays: number }) {
  const highlight = usePlanHighlight(plans.map((p) => p.period));
  return (
    <div {...highlight.gridProps} className="grid gap-4 pt-3 md:grid-cols-2">
      {plans.map((plan) => (
        <PlanCard
          key={`${plan.period}-${plan.days}`}
          plan={plan}
          plans={plans}
          trialDays={trialDays}
          highlighted={highlight.isHighlighted(plan.period)}
          {...highlight.cardProps(plan.period)}
        />
      ))}
    </div>
  );
}
