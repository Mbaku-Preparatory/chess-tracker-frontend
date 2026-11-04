import { LichessLogo } from "@/components/ui/LichessLogo";
import type { Provider } from "@/lib/linkedAuth";

/**
 * The logo for a sign-in provider, where we have the right to show one.
 *
 * Lichess: its own logo (see LichessLogo for its terms). Chess.com: none yet.
 * Its brand page offers logo files but no terms for a sign-in button, so the
 * button is words alone until Chess.com's approval says how to show it.
 */
export function ProviderLogo({ provider, size = 18, className = "" }: { provider: Provider; size?: number; className?: string }) {
  if (provider === "lichess") return <LichessLogo size={size} className={className} />;
  return null;
}
