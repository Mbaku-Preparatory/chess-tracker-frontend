"use client";

/**
 * Poll a payment until it settles.
 *
 * Extracted rather than written into the form because the waiting is the part
 * that is easy to get wrong and the part every future payment flow will need
 * unchanged — a tip today, an unlock or a renewal later. The form should only
 * have to decide what to render.
 *
 * Two rules, both learned from the M-Pesa build:
 *
 *  - polling is bounded. A spinner that never stops is worse than an honest
 *    "we stopped checking", because the payer cannot tell the difference
 *    between "still working" and "broken".
 *  - a dropped poll says nothing about the payment. The payment is being
 *    decided on Paystack's side either way, so a network blip keeps asking
 *    rather than reporting failure.
 */

import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { Payment } from "@/types";

const POLL_INTERVAL_MS = 2500;

/**
 * Long enough for a payer who is still typing an M-Pesa PIN on their handset,
 * short enough to stop. The backend also verifies against Paystack itself once
 * a payment is more than ten seconds old, so most answers arrive well inside
 * this.
 */
const POLL_CEILING_MS = 120_000;

export type PollState = "idle" | "polling" | "settled" | "gave-up";

export function usePaymentStatus(reference: string | null) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [state, setState] = useState<PollState>(reference ? "polling" : "idle");
  const startedAt = useRef(0);

  useEffect(() => {
    if (!reference) {
      setState("idle");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    startedAt.current = Date.now();
    setState("polling");

    const tick = async () => {
      try {
        const next = await api.getPayment(reference);
        if (cancelled) return;
        setPayment(next);
        if (next.status !== "pending") {
          setState("settled");
          return;
        }
      } catch {
        // Deliberately ignored — see the note above. Keep asking until the
        // ceiling rather than reporting a failure that has not happened.
      }
      if (cancelled) return;
      if (Date.now() - startedAt.current > POLL_CEILING_MS) {
        setState("gave-up");
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    // Immediately, not after an interval: the payer has just come back from
    // Paystack and the answer is usually already waiting.
    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reference]);

  return { payment, state };
}
