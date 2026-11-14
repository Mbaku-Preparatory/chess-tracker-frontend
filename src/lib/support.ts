/**
 * How a user reaches a person. The address, the WhatsApp number, the reply
 * time and the refund days all come from the backend (support/contact.py), so
 * changing any of them is a Railway variable, never a copy edited here.
 */

import { graphqlGet } from "./publicGraphql";

export const HELP_PATH = "/help";

export type SupportContact = {
  email: string;
  /** Digits, international format; "" when there is no WhatsApp number. */
  whatsapp: string;
  replyHours: number;
  refundDays: number;
};

export type SupportCategory = "payment" | "import" | "other";

const QUERY = "{ supportContact { email whatsapp replyHours refundDays } }";

/** Null when the backend could not answer; the next revalidation tries again. */
export async function fetchSupportContact(): Promise<SupportContact | null> {
  try {
    const data = await graphqlGet<{ supportContact: SupportContact }>(QUERY, {}, { next: { revalidate: 600, tags: ["support"] } });
    return data.supportContact;
  } catch {
    return null;
  }
}

export function whatsappLink(number: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent("Hi, I need help with Chess Preparatory.")}`;
}

/**
 * The help page, remembering the page someone was on: the report form sends
 * it with the report. (A link click inside the app does not change
 * document.referrer, so it travels in the URL.) No #anchor: the form is the
 * whole page, and jumping to it hid the page's title under the sticky navbar.
 */
export function helpHref(from?: string): string {
  return from ? `${HELP_PATH}?from=${encodeURIComponent(from)}` : HELP_PATH;
}

/** What a report is probably about, from the page it came from. */
export function categoryFor(from: string): SupportCategory {
  if (/subscri|billing|pricing/.test(from)) return "payment";
  if (/import/.test(from)) return "import";
  return "other";
}
