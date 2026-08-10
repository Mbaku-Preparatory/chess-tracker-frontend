"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@/lib/api";
import { useAppDispatch } from "@/redux/hooks";
import { setAuth } from "@/redux/actions/auth";
import { userMessage } from "@/lib/apiError";

function VerifyEmailForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.verifyEmail(email, code.trim());
      dispatch(setAuth({ token: data.access, refreshToken: data.refresh, email: data.email }));
      router.replace("/");
    } catch (err) {
      setError(userMessage(err, "Verification failed."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResent(false);
    try {
      await api.resendVerification(email);
      setResent(true);
    } catch (err) {
      setError(userMessage(err, "Couldn't resend the code."));
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
            MP
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Verify your email</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {email
              ? `Enter the code we sent to ${email}.`
              : "Enter the code we sent to your email."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {resent && !error && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              A new code is on its way.
            </div>
          )}

          <div>
            <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Verification code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-center text-lg tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.trim().length !== 6}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Didn&apos;t get a code?{" "}
          <button
            type="button"
            onClick={handleResend}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Resend
          </button>
        </p>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
