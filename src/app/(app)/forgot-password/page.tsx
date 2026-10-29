"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/ui/Logo";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";

const input =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500";
const label = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

/**
 * Forgot password: an email, then the six-digit code it receives and a new
 * password. The first step says the same thing whether or not the email has
 * an account, so it can't be used to find out who does.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.forgotPassword(email.trim().toLowerCase());
      if (step === "code") setResent(true);
      setStep("code");
    } catch (err) {
      setError(userMessage(err, "Couldn't send a code. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    try {
      await api.resetPassword(email.trim().toLowerCase(), code.trim(), password);
      router.replace("/login?reset=1");
    } catch (err) {
      setError(userMessage(err, "Couldn't reset your password."));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo size={48} variant="tile" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {step === "email" ? "We'll email you a code." : `If ${email.trim()} has an account, a code is on its way.`}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={sendCode} className="card space-y-4 p-6">
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div>
              <label htmlFor="email" className={label}>Email</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full justify-center disabled:opacity-60">
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={reset} className="card space-y-4 p-6">
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div>
              <label htmlFor="code" className={label}>Code from the email</label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={`${input} tracking-[0.3em]`}
                placeholder="123456"
              />
            </div>
            <div>
              <label htmlFor="new-password" className={label}>New password</label>
              <input id="new-password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
            </div>
            <div>
              <label htmlFor="confirm-password" className={label}>New password again</label>
              <input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
            </div>
            <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full justify-center disabled:opacity-60">
              {busy ? "Saving…" : "Set new password"}
            </button>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {resent ? "Sent again. " : "No email? "}
              <button type="button" onClick={() => sendCode()} disabled={busy} className="font-medium text-brand-600 hover:text-brand-700 disabled:opacity-60">
                Send another code
              </button>
            </p>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
