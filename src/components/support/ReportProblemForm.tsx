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

/** Where they were before the help page: helpHref puts it in ?from=. */
function cameFrom(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("from") ?? "";
}

/**
 * "Report a problem", for a signed-in account only: the backend then knows
 * who it is and attaches their access, last payment and last import, so the
 * form asks for nothing but what went wrong. Signed out, it points to logging
 * in; the email and WhatsApp above it are for everyone.
 */
export function ReportProblemForm() {
  const signedIn = useSignedIn();
  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The reply time the backend promised, once it has the report.
  const [sent, setSent] = useState<number | null>(null);

  // Null until the browser has looked, as on the server render.
  if (signedIn === null) return null;

  if (!signedIn) {
    return (
      <p className="text-[16px] leading-[1.55] text-ink-muted">
        Have an account?{" "}
        <AuthLink href="/login" className="text-ink-text underline decoration-ink-line underline-offset-4 hover:text-accent-soft">
          Log in
        </AuthLink>{" "}
        and come back here to report a problem: it tells us which account and payment it is about.
      </p>
    );
  }

  if (sent !== null) {
    return (
      <p role="status" className="rounded-xl bg-ink-card p-6 text-[16px] leading-[1.55]">
        Sent. We&apos;ll reply by email within {sent} hours, and a copy of your message is in your inbox.
      </p>
    );
  }

  const chosen = category ?? categoryFor(cameFrom());

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const { reply_hours } = await api.reportProblem({ category: chosen, message: message.trim(), page: cameFrom() });
      setSent(reply_hours);
    } catch (err) {
      setError(userMessage(err, "Couldn't send your report. Please try again."));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-4 rounded-xl bg-ink-card p-6">
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-2 text-[15px] text-ink-muted">What is it about?</legend>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={chosen === c.value}
            onClick={() => setCategory(c.value)}
            className={`rounded-pill border px-4 py-2 text-[15px] ${
              chosen === c.value ? "border-accent bg-accent text-accent-on" : "border-ink-line text-ink-text hover:bg-ink-raised"
            }`}
          >
            {c.label}
          </button>
        ))}
      </fieldset>
      <label className="flex flex-col gap-2">
        <span className="text-[15px] text-ink-muted">What happened?</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          maxLength={MAX}
          rows={5}
          placeholder={chosen === "payment" ? "For M-Pesa, the confirmation code helps (e.g. SKL4ABC123)." : "What you did, and what you expected."}
          className="rounded-xl border border-ink-line bg-ink-canvas p-3 text-[16px] text-ink-text placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
      </label>
      {error && <p role="alert" className="text-[15px] text-red-500">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="rounded-pill bg-accent px-6 py-3 text-[16px] font-[480] text-accent-on hover:bg-accent-soft disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
