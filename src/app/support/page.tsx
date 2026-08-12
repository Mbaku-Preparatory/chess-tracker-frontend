import { redirect } from "next/navigation";

/**
 * Support (tipping) is hidden until M-Pesa go-live.
 *
 * The tip flow works, but MPESA_SHORTCODE is still Safaricom's shared sandbox
 * paybill — money paid here would go to their test account, not to us. Removing
 * the navbar link alone would leave the page reachable by URL, so the route
 * redirects instead.
 *
 * The UI lives on in src/components/TipForm.tsx. To bring this back: restore
 * the page body from git history, re-add the navbar link, and only then flip
 * MPESA_ENV to production.
 */
export default function SupportPage() {
  redirect("/players");
}
