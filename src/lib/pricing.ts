/**
 * The public pricing page's data: the plans on sale, by region, and the length
 * of the free trial. From the backend's Plan table (subscriptions/public_schema.py),
 * the same rows the sales panel edits and checkout charges, so no price is
 * written down here.
 */

import { graphqlGet } from "./publicGraphql";

// A price edited in the panel shows on the page within ten minutes.
export const PRICING_REVALIDATE = 600;

export type PublicPlan = { period: "month" | "year"; days: number; price: string; currency: string };
export type PricingRegion = { name: string; currency: string; countries: string[]; plans: PublicPlan[] };
export type PublicPricing = { trialDays: number; assistantMonthlyQuestions: number; regions: PricingRegion[] };

const QUERY = `{ publicPricing { trialDays assistantMonthlyQuestions regions { name currency countries plans { period days price currency } } } }`;

/** Null when the backend could not answer: the page says so rather than
 * failing, and the next revalidation tries again. */
export async function fetchPublicPricing(): Promise<PublicPricing | null> {
  try {
    const data = await graphqlGet<{ publicPricing: PublicPricing }>(QUERY, {}, {
      next: { revalidate: PRICING_REVALIDATE, tags: ["pricing"] },
    });
    return data.publicPricing;
  } catch {
    return null;
  }
}

const REGION_NAMES = new Intl.DisplayNames(["en"], { type: "region" });
// ICU's names for these read like a disambiguation page.
const SHORT_NAMES: Record<string, string> = { CD: "DR Congo", HK: "Hong Kong", MO: "Macau" };

/** "Kenya, Uganda, Tanzania…" for a list of ISO country codes, by name. */
export function countryNames(codes: string[]): string[] {
  return codes
    .map((c) => SHORT_NAMES[c] ?? REGION_NAMES.of(c) ?? c)
    .sort((a, b) => a.localeCompare(b));
}
