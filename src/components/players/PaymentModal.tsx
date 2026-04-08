"use client";

import { useCallback, useEffect, useState } from "react";

import {
  formatKenyanPhoneNumber,
  normalizeKenyanPhoneNumber,
} from "@/lib/phone";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  checkAccess,
  clearPaymentState,
  initiatePayment,
  setPhoneNumber,
} from "@/store/slices/paymentSlice";

interface PaymentModalProps {
  playerSlug: string;
  playerName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({
  playerSlug,
  playerName,
  open,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const dispatch = useAppDispatch();
  const { phoneNumber, paying, error, paymentPending, paymentMessage, paymentSuccess } =
    useAppSelector((s) => s.payment);
  const [localPhone, setLocalPhone] = useState(phoneNumber);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  useEffect(() => {
    setLocalPhone(phoneNumber);
  }, [phoneNumber]);

  useEffect(() => {
    if (open) {
      if (typeof window !== "undefined") {
        setCustomerName(localStorage.getItem("cs_customer_name") || "");
        setCustomerEmail(localStorage.getItem("cs_customer_email") || "");
      }
      setCheckingAccess(false);
      setPendingError(null);
      dispatch(clearPaymentState());
    }
  }, [dispatch, open]);

  useEffect(() => {
    if (paymentSuccess) {
      const timer = setTimeout(() => {
        onSuccess();
        dispatch(clearPaymentState());
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [dispatch, onSuccess, paymentSuccess]);

  const handleClose = useCallback(() => {
    dispatch(clearPaymentState());
    setCheckingAccess(false);
    setPendingError(null);
    onClose();
  }, [dispatch, onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const cleaned = normalizeKenyanPhoneNumber(localPhone);
      if (!cleaned) return;
      const trimmedName = customerName.trim();
      const trimmedEmail = customerEmail.trim().toLowerCase();
      if (!trimmedName || !trimmedEmail) return;

      setPendingError(null);
      dispatch(setPhoneNumber(cleaned));
      localStorage.setItem("cs_phone", cleaned);
      localStorage.setItem("cs_customer_name", trimmedName);
      localStorage.setItem("cs_customer_email", trimmedEmail);
      dispatch(
        initiatePayment({
          slug: playerSlug,
          phone: cleaned,
          customerName: trimmedName,
          customerEmail: trimmedEmail,
        })
      );
    },
    [customerEmail, customerName, dispatch, localPhone, playerSlug]
  );

  const handleCheckUnlock = useCallback(async () => {
    const cleaned = normalizeKenyanPhoneNumber(localPhone || phoneNumber);
    if (!cleaned) return;

    setCheckingAccess(true);
    setPendingError(null);

    try {
      const result = await dispatch(
        checkAccess({ slug: playerSlug, phone: cleaned })
      ).unwrap();

      if (result.access) {
        dispatch(clearPaymentState());
        onSuccess();
        return;
      }

      setPendingError("Payment is still pending for this number. Try again in a few seconds.");
    } catch (err) {
      setPendingError(
        err instanceof Error ? err.message : "Unable to verify payment right now."
      );
    } finally {
      setCheckingAccess(false);
    }
  }, [dispatch, localPhone, onSuccess, phoneNumber, playerSlug]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
        {paymentSuccess ? (
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 px-8 py-12 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
              <svg className="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
              Access Confirmed
            </p>
            <h3 className="mt-3 text-2xl font-bold">Prep unlocked.</h3>
            <p className="mt-2 text-sm text-slate-300">
              Loading your Mbaku dossier for {playerName}.
            </p>
          </div>
        ) : paymentPending ? (
          <>
            <div className="rounded-t-2xl bg-slate-950 px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                    Payment Pending
                  </p>
                  <h3 className="mt-2 text-base font-bold text-white">
                    Confirm unlock for {playerName}
                  </h3>
                </div>
                <button
                  onClick={handleClose}
                  className="ml-4 flex-shrink-0 text-gray-500 transition hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-900">
                  {paymentMessage || "We have your request. Confirm the payment, then check access."}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Using phone: {formatKenyanPhoneNumber(localPhone || phoneNumber)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  What Happens Next
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>Approve the Cellulant M-Pesa prompt on your phone if it arrives.</li>
                  <li>Use the same phone number again to unlock instantly.</li>
                  <li>If the callback is delayed, check unlock again with the same number.</li>
                </ul>
              </div>

              {pendingError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  {pendingError}
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckUnlock}
                disabled={checkingAccess}
                className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50"
              >
                {checkingAccess ? "Checking access..." : "I Paid, Check Unlock"}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-t-2xl bg-slate-950 px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-300">
                    Unlock Prep
                  </p>
                  <h3 className="text-base font-bold text-white">
                    {playerName} Preparatory
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-400">
                    One payment. Linked to your phone. Open every time you face this player.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="ml-4 flex-shrink-0 text-gray-500 transition hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Pay KES 10 to access
                </p>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Instant Unlock
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
                {[
                  "How you beat this player as White and Black",
                  "Common mistakes other opponents make",
                  "30-second prep mode before you sit down",
                  "Opening comfort zones and real weak points",
                  "Evidence from recent games and scoring splits",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1 w-1 flex-shrink-0 rounded-full bg-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5">
              <label
                htmlFor="customerName"
                className="mb-1.5 block text-sm font-semibold text-gray-700"
              >
                Full name
              </label>
              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Clifford Mwangi"
                required
                autoFocus
                autoComplete="name"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />

              <label
                htmlFor="customerEmail"
                className="mb-1.5 mt-4 block text-sm font-semibold text-gray-700"
              >
                Email address
              </label>
              <input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />

              <label
                htmlFor="phone"
                className="mb-1.5 mt-4 block text-sm font-semibold text-gray-700"
              >
                M-Pesa phone number
              </label>
              <input
                id="phone"
                type="tel"
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value)}
                placeholder="e.g. 0712 345 678"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Kenyan number: `07xx`, `01xx`, or `254xx`
              </p>
              {localPhone.trim() && (
                <p className="mt-1 text-xs text-gray-500">
                  Access will be saved to {formatKenyanPhoneNumber(localPhone)}.
                </p>
              )}

              {error && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={paying || !localPhone.trim() || !customerName.trim() || !customerEmail.trim()}
                className="mt-5 w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50"
              >
                {paying ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Unlock for KES 10"
                )}
              </button>

              <p className="mt-3 text-center text-xs text-gray-400">
                Cellulant needs the same phone number for the STK push. Access still reopens by phone number.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
