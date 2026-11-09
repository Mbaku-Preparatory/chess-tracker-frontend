/**
 * Paywall helpers shared by the API clients, the gate and the pages.
 *
 * The backend decides who may use the app (subscriptions/services.py) and says
 * so two ways: GET /api/subscriptions/me/ answers `allowed`, and any product
 * endpoint answers 402 once access has run out. Both end up here.
 */

export const SUBSCRIPTION_EXPIRED_PATH = "/subscription-expired";
export const SUBSCRIBE_PATH = "/subscribe";
export const BILLING_PATH = "/billing";

/**
 * Pages a user whose access has run out can still open: their account, help,
 * and the pages that take the payment. Everything else in the signed-in app
 * sends them to SUBSCRIPTION_EXPIRED_PATH.
 */
export function isOpenWithoutAccess(pathname: string): boolean {
  return [SUBSCRIPTION_EXPIRED_PATH, SUBSCRIBE_PATH, BILLING_PATH, "/settings", "/support"].includes(pathname);
}

let redirecting = false;

/**
 * A full navigation rather than a router push: it works from the API clients,
 * which sit outside React, and drops whatever half-loaded page asked.
 */
export function sendToSubscriptionExpired(): void {
  if (typeof window === "undefined" || redirecting) return;
  if (isOpenWithoutAccess(window.location.pathname)) return;
  redirecting = true;
  window.location.assign(SUBSCRIPTION_EXPIRED_PATH);
}

/** "KES 300", "$4.99": a price as the backend sent it, tidied for reading. */
export function formatPrice(amount: string, currency: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`;
  const digits = Number.isInteger(n) ? 0 : 2;
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return currency === "USD" ? `$${formatted}` : `${currency} ${formatted}`;
}

/**
 * How much cheaper a year is than twelve months, as a whole percentage, or
 * null when it is not cheaper. For the "Save 31%" badge on /subscribe and
 * /pricing alike.
 */
export function annualSaving(monthlyPrice: string, annualPrice: string): number | null {
  const twelve = Number(monthlyPrice) * 12;
  if (!(twelve > 0)) return null;
  const pct = Math.round((1 - Number(annualPrice) / twelve) * 100);
  return pct > 0 ? pct : null;
}

/** "That's KES 83 a month": an annual price spread over twelve months.
 * Shillings are quoted whole; dollars to the cent. */
export function perMonthOfAnnual(annualPrice: string, currency: string): string {
  const monthly = Number(annualPrice) / 12;
  return formatPrice(currency === "KES" ? String(Math.round(monthly)) : monthly.toFixed(2), currency);
}

/** "7 Nov 2026": for lists, where the year matters and the weekday doesn't. */
export function formatShortDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "Friday 20 November". */
export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}
