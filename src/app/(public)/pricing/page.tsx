import { PRICING_METADATA, PricingView } from "@/components/public/pricing/PricingView";

export const metadata = PRICING_METADATA;

/**
 * Only reached when middleware.ts did not run (it rewrites every /pricing
 * visit to /pricing/in/<country>): priced as an unknown country.
 */
export default function PricingPage() {
  return <PricingView country="" />;
}
