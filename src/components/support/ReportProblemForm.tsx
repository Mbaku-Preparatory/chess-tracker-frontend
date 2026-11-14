"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { categoryFor, type SupportCategory } from "@/lib/support";

const CATEGORIES: { value: SupportCategory; label: string }[] = [
  { value: "payment", label: "Payment" },
  { value: "import", label: "Import" },
  { value: "other", label: "Something else" },
];

const MAX = 4000;

// How long "Sent" stays up before the form is just the form again.
const SENT_SHOWN_MS = 6000;

// The Settings page's field style, so the form reads as part of the app.
const FIELD =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500";

/** Where they were before the help page: helpHref puts it in ?from=. */
function cameFrom(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("from") ?? "";
}

/** One labelled row: label on the left from `sm` up, above the field on a phone. */
function Row({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-6">
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:w-28 sm:shrink-0 sm:pt-2.5">
        {label}
      </label>
      <div className="w-full sm:max-w-[450px]">{children}</div>
    </div>
  );
}

/**
 * The help page's message form, laid out like Bomahut's "Send Custom Message"
 * form: a title and one line saying what it is for, labelled rows, then a wide
 * Send button with Cancel under it.
 *
 * The help page is inside the signed-in app, so the backend knows who is
 * writing and attaches their access, last payment and last import: the form
 * asks for nothing but the topic and what went wrong.
 */
export function ReportProblemForm({ replyHours }: { replyHours: number | null }) {
  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The reply time the backend promised, shown for a few seconds after a send.
  const [sent, setSent] = useState<number | null>(null);
  // Read after mount: the server render has no URL to read, and a topic
  // worked out during render stayed on the server's "Something else".
  const [from, setFrom] = useState("");

  useEffect(() => setFrom(cameFrom()), []);

  useEffect(() => {
    if (sent === null) return;
    const t = setTimeout(() => setSent(null), SENT_SHOWN_MS);
    return () => clearTimeout(t);
  }, [sent]);

  // Said only when the backend said it: a promise is not guessed at.
  const within = replyHours ? ` within ${replyHours} hours` : "";
  const chosen = category ?? categoryFor(from);

  function clear() {
    setCategory(null);
    setMessage("");
    setError(null);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const { reply_hours } = await api.reportProblem({ category: chosen, message: message.trim(), page: from });
      // The form stays, emptied, so a second message needs no reload.
      clear();
      setSent(reply_hours);
    } catch (err) {
      setError(userMessage(err, "Couldn't send your message. Please try again."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Send us a message</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Use this form to tell us about a payment, an import, or anything else. A person replies{within}.
        </p>
        {/* Always in the page, so a screen reader announces the text when it
            appears; inside the heading block so, empty, it adds no gap. */}
        <div role="status" aria-live="polite">
          {sent !== null && (
            <p className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-200">
              Sent. We&apos;ll reply to your email address within {sent} hours, and we&apos;ve emailed you a copy of your message.
            </p>
          )}
        </div>
      </div>

      <form onSubmit={send} className="flex max-w-[580px] flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            {error}
          </p>
        )}
        <Row label="Topic" htmlFor="report-topic">
          <select
            id="report-topic"
            value={chosen}
            onChange={(e) => setCategory(e.target.value as SupportCategory)}
            className={FIELD}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Row>
        <Row label="Message" htmlFor="report-message">
          <textarea
            id="report-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            maxLength={MAX}
            rows={6}
            placeholder={chosen === "payment" ? "What happened, and the reference on your payment receipt if you have it." : "Message ..."}
            className={FIELD}
          />
        </Row>
        <div className="mt-2 flex flex-col items-center gap-3">
          <button type="submit" disabled={sending || !message.trim()} className="btn-primary w-full shadow-md disabled:opacity-60 sm:w-4/5">
            {sending ? "Sending…" : "Send Message"}
          </button>
          {message && (
            <button type="button" onClick={clear} className="btn-secondary w-full shadow-md sm:w-4/5">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
