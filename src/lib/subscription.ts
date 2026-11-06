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
