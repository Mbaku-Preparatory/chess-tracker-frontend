import { PRICING_METADATA, PricingView } from "@/components/public/pricing/PricingView";
import { cleanCountry } from "@/lib/pricingCountry";

export const metadata = PRICING_METADATA;

/**
 * /pricing for one country. middleware.ts rewrites /pricing here with the
 * visitor's country (or "unknown"), so the address bar still says /pricing and
 * each country's page is built once and cached, like any static page: no list
 * of countries up front, each built on its first visit and refreshed as the
 * prices are (lib/pricing.ts).
 */
export function generateStaticParams() {
  return [];
}

export default async function PricingForCountry({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  return <PricingView country={cleanCountry(country)} />;
}
