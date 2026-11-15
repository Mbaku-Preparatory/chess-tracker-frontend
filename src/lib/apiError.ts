/**
 * User-facing error messages.
 *
 * Nothing a user sees should contain an HTTP status, a stack, or a phrase like
 * "Bad Gateway". They cannot act on it and it reads as the app being broken.
 * The technical detail is not thrown away — it goes on the error object and to
 * the console, so debugging from a screenshot or a session is still possible.
 */

import { msg } from "@/lib/i18n";

export interface AppError extends Error {
  /** HTTP status, when the failure came from a response. */
  status?: number;
  /** Parsed response body, for debugging. Never rendered. */
  body?: unknown;
  /** The raw message we would have shown before. Never rendered. */
  technical?: string;
}

/**
 * What the backend says when sign-in or sign-up is refused, word for word
 * (users/views.py, services.py, validators.py), so a page that shows the
 * error with t() shows it in the reader's language. If the backend rewords
 * one, that message is simply shown in English.
 */
export const BACKEND_AUTH_MESSAGES = [
  msg("Invalid email or password."),
  msg("Please verify your email before logging in."),
  msg("This account has been suspended. Contact support."),
  msg("Email/username and password are required."),
  msg("Google sign-in is not available right now. Try again, or use your email and password."),
  msg("An account with this email already exists."),
  msg("That username is already taken."),
  msg("That username or email is already registered."),
  msg("A username can only contain an @ if it is your own email address."),
  msg("Invalid email or code."),
  msg("This email is already verified. Please log in."),
  msg("That code is incorrect or has expired."),
  msg("Something went wrong signing you in. Please try again."),
  msg("Email is required."),
  msg("Enter a valid email address."),
  msg("Username is required."),
  msg("Password is required."),
];

const GENERIC = msg("Something went wrong. Please try again.");

/**
 * Backend `detail` strings are written for users in the places that matter
 * ("Enter at least 3 characters to search FIDE."), so a 4xx keeps its detail.
 * A 5xx never does — those read like "Could not reach FIDE: HTTPSConnectionPool
 * (host=...)", which is a log line, not a message.
 */
function messageForStatus(status: number, detail?: string): string {
  if (status >= 500) {
    if (status === 502 || status === 503 || status === 504) {
      return msg("This service is temporarily unavailable. Please try again in a few minutes.");
    }
    return msg("Something went wrong on our end. Please try again, or tell us on the Help page if it keeps happening.");
  }

  switch (status) {
    case 401:
      return msg("Your session has expired. Please sign in again.");
    case 403:
      return msg("You do not have permission to do that.");
    case 404:
      return msg("We couldn't find what you were looking for.");
    case 408:
      return msg("That took too long. Please try again.");
    case 429:
      return msg("Too many requests. Please wait a moment and try again.");
    default:
      // 400/409/422 and friends: the backend's detail is the useful part.
      return detail?.trim() || GENERIC;
  }
}

/** Build the error thrown for a failed response. */
export function buildApiError(status: number, statusText: string, body: unknown): AppError {
  const detail =
    body && typeof body === "object" && typeof (body as { detail?: unknown }).detail === "string"
      ? (body as { detail: string }).detail
      : undefined;

  const err = new Error(messageForStatus(status, detail)) as AppError;
  err.status = status;
  err.body = body;
  err.technical = `${status} ${statusText}${detail ? ` — ${detail}` : ""}`;

  if (typeof console !== "undefined") {
    console.error(`[api] ${err.technical}`);
  }
  return err;
}

/** Build the error thrown when the request never got a response at all. */
/** The request was cancelled on purpose (an AbortController): not an error to show. */
export function wasAborted(err: unknown): boolean {
  if (err instanceof DOMException) return err.name === "AbortError";
  const technical = (err as { technical?: unknown })?.technical;
  return typeof technical === "string" && /abort/i.test(technical);
}

export function buildNetworkError(cause: unknown): AppError {
  const err = new Error(
    msg("Can't reach the server. Check your connection and try again.")
  ) as AppError;
  err.technical = cause instanceof Error ? cause.message : String(cause);

  if (typeof console !== "undefined") {
    console.error(`[api] network failure: ${err.technical}`);
  }
  return err;
}

/**
 * Last line of defence for `catch` blocks: turns anything into something safe
 * to render. Errors from buildApiError are already safe and pass through.
 */
export function userMessage(err: unknown, fallback = GENERIC): string {
  if (err instanceof Error) {
    const app = err as AppError;
    if (app.status !== undefined || app.technical !== undefined) return err.message;
    // An error from somewhere else — its text was never vetted for users.
    if (typeof console !== "undefined") console.error("[ui]", err);
    return fallback;
  }
  return fallback;
}

/**
 * Why the login endpoint refused. Its `detail` is written for this moment, so it
 * is shown as it is: the status messages above are about a session, and would
 * tell someone with a wrong password that theirs had expired. An unverified
 * account also comes back with its address, for the code screen.
 */
export function loginRefusal(err: unknown): { message: string; unverifiedEmail?: string } {
  const { status, body } = err as AppError;
  const { detail, code, email } = (body ?? {}) as {
    detail?: unknown;
    code?: unknown;
    email?: unknown;
  };
  if (code === "email_unverified" && typeof email === "string") {
    return { message: typeof detail === "string" ? detail : "", unverifiedEmail: email };
  }
  if ((status === 401 || status === 403) && typeof detail === "string") {
    return { message: detail };
  }
  return { message: userMessage(err, msg("Login failed.")) };
}
