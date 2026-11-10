/**
 * The public pricing page's data: the plans on sale in one visitor's country,
 * and the length of the free trial. From the backend's Plan table
 * (subscriptions/public_schema.py), the same rows the sales panel edits and
 * checkout charges, and priced by the same country-to-group rule, so no price
 * and no list of countries is written down here.
 *
 * The country is Vercel's geolocation of the visitor, which middleware.ts
 * passes in the path (/pricing → /pricing/in/KE), so each country's page is
 * cached on its own.
 */

import { graphqlGet } from "./publicGraphql";

// Shown only when the backend could not answer (and no prices show either).
export const DEFAULT_TRIAL_DAYS = 14;
export const DEFAULT_ASSISTANT_QUESTIONS = 20;

// A price edited in the panel shows on the page within ten minutes.
export const PRICING_REVALIDATE = 600;

export type PublicPlan = { period: "month" | "year"; days: number; price: string; currency: string };
export type PricingRegion = { name: string; currency: string; countries: string[]; plans: PublicPlan[] };
export type PublicPricing = { trialDays: number; assistantMonthlyQuestions: number; region: PricingRegion | null };

const QUERY = `query Pricing($country: String!) { publicPricing(country: $country) {
  trialDays assistantMonthlyQuestions region { name currency countries plans { period days price currency } }
} }`;


/** Null when the backend could not answer: the page says so rather than
 * failing, and the next revalidation tries again. */
export async function fetchPublicPricing(country: string): Promise<PublicPricing | null> {
  try {
    const data = await graphqlGet<{ publicPricing: PublicPricing }>(QUERY, { country }, {
      next: { revalidate: PRICING_REVALIDATE, tags: ["pricing"] },
    });
    return data.publicPricing;
  } catch {
    return null;
  }
}

const REGION_NAMES = new Intl.DisplayNames(["en"], { type: "region" });
// ICU's names for these read like a disambiguation page.
const SHORT_NAMES: Record<string, string> = { CD: "DR Congo", CG: "Congo", HK: "Hong Kong", MO: "Macau", PS: "Palestine" };

/** "Kenya" for "KE"; "" for a code nobody knows. */
export function countryName(code: string): string {
  if (!code) return "";
  try {
    const name = SHORT_NAMES[code] ?? REGION_NAMES.of(code) ?? "";
    return name === code ? "" : name;
  } catch {
    return "";
  }
}

export function currencyName(currency: string): string {
  return currency === "USD" ? "US dollars" : currency === "KES" ? "Kenyan shillings" : currency;
}
