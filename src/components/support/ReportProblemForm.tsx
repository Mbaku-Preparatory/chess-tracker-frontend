"use client";

import { useState } from "react";

import { AuthLink } from "@/components/public/AuthLink";
import { useSignedIn } from "@/hooks/useSignedIn";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { categoryFor, type SupportCategory } from "@/lib/support";

const CATEGORIES: { value: SupportCategory; label: string }[] = [
  { value: "payment", label: "Payment" },
  { value: "import", label: "Import" },
  { value: "other", label: "Something else" },
];

const MAX = 4000;

const LINK = "text-ink-text underline decoration-ink-line underline-offset-4 hover:text-accent-soft";
const FIELD =
  "w-full rounded-lg border border-ink-line bg-ink-canvas px-3 py-2.5 text-[16px] text-ink-text placeholder:text-ink-faint focus:border-accent focus:outline-none";

/** Where they were before the help page: helpHref puts it in ?from=. */
function cameFrom(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("from") ?? "";
}

/** One labelled row: label on the left from `sm` up, above the field on a phone. */
function Row({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">
      <label htmlFor={htmlFor} className="text-[15px] font-[480] text-ink-text sm:w-32 sm:shrink-0 sm:pt-2.5">
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
 * For a signed-in account only: the backend then knows who it is and attaches
 * their access, last payment and last import, so the form asks for nothing but
 * the topic and what went wrong. Signed out, it points to logging in; the email
 * and WhatsApp below it are for everyone.
 */
export function ReportProblemForm({ replyHours }: { replyHours: number | null }) {
  const signedIn = useSignedIn();
  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The reply time the backend promised, once it has the message.
  const [sent, setSent] = useState<number | null>(null);

  // Said only when the backend said it: a promise is not guessed at.
  const within = replyHours ? ` within ${replyHours} hours` : "";
  const chosen = category ?? categoryFor(cameFrom());

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
      const { reply_hours } = await api.reportProblem({ category: chosen, message: message.trim(), page: cameFrom() });
      setSent(reply_hours);
    } catch (err) {
      setError(userMessage(err, "Couldn't send your message. Please try again."));
    } finally {
      setSending(false);
    }
  }

  let body: React.ReactNode;
  // Null until the browser has looked, as on the server render.
  if (signedIn === null) {
    body = <div className="h-40" />;
  } else if (!signedIn) {
    body = (
      <p className="text-[16px] leading-[1.55] text-ink-muted">
        <AuthLink href="/login" className={LINK}>Log in</AuthLink> and come back here to send a message: it tells us
        which account and payment it is about. No account? Reach us directly below.
      </p>
    );
  } else if (sent !== null) {
    body = (
      <p role="status" className="rounded-lg bg-ink-raised p-5 text-[16px] leading-[1.55]">
        Sent. We&apos;ll reply by email within {sent} hours, and a copy of your message is in your inbox.
      </p>
    );
  } else {
    body = (
      <form onSubmit={send} className="flex max-w-[602px] flex-col gap-5">
        {error && (
          <p role="alert" className="rounded-lg border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-[15px] text-ink-text">
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
            placeholder={chosen === "payment" ? "For M-Pesa, the confirmation code helps (e.g. SKL4ABC123)." : "Message ..."}
            className={FIELD}
          />
        </Row>
        <div className="mt-2 flex flex-col items-center gap-3">
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="w-full rounded-lg bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on shadow-md hover:bg-accent-soft disabled:opacity-60 sm:w-4/5"
          >
            {sending ? "Sending…" : "Send Message"}
          </button>
          {message && (
            <button
              type="button"
              onClick={clear}
              className="w-full rounded-lg border border-accent bg-ink-card px-6 py-3 text-[16px] text-accent-soft shadow-md hover:bg-ink-raised sm:w-4/5"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <div id="report" className="flex scroll-mt-24 flex-col gap-6 border-b border-ink-line pb-10">
      <div className="flex flex-col gap-3">
        <h2 className="text-[28px] font-[480] leading-[1.2] tracking-[0.015em] sm:text-[32px]">Send us a message</h2>
        <p className="max-w-[60ch] text-[16px] leading-[1.55] text-ink-muted">
          Use this form to tell us about a payment, an import, or anything else. A person replies{within}.
        </p>
      </div>
      {body}
    </div>
  );
}
