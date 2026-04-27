"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchActiveTournament,
  createTournament,
  upsertPairing,
  closeTournament,
} from "@/redux/actions/tournament";
import { getPreparedPlayerImportHref, prepareOpponent } from "@/lib/prepareOpponent";
import type { Pairing } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNextPairing(pairings: Pairing[]): Pairing | null {
  const pending = pairings.filter((p) => !p.result);
  if (pending.length > 0) {
    return pending.reduce((a, b) => (b.round_number > a.round_number ? b : a));
  }
  if (pairings.length > 0) {
    return pairings.reduce((a, b) => (b.round_number > a.round_number ? b : a));
  }
  return null;
}

const COLOR_LABEL: Record<string, string> = {
  white: "White",
  black: "Black",
};

const RESULT_LABELS: Record<string, { label: string; className: string }> = {
  win: { label: "Won", className: "text-emerald-600 dark:text-emerald-400" },
  draw: { label: "Draw", className: "text-gray-500 dark:text-gray-400" },
  loss: { label: "Lost", className: "text-red-600 dark:text-red-400" },
};

// ── Create Tournament Form ────────────────────────────────────────────────────

function CreateTournamentForm() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.tournament);
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    dispatch(createTournament({ url: url.trim() }));
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-dark-border dark:text-gray-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
        Playing in a tournament?
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900/50 dark:bg-brand-950/20">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Start tournament tracking
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://chess-results.com/tnr…"
            autoFocus
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500"
          />
          {url && url.includes("chess-results.com") && (
            <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">
              ✓ Tournament name and player list will be pulled automatically
            </p>
          )}
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Fetching tournament…" : "Start tournament"}
        </button>
      </form>
    </div>
  );
}

// ── Add/Update Pairing Form ───────────────────────────────────────────────────

function PairingForm({
  tournamentId,
  existingRound,
  onClose,
}: {
  tournamentId: number;
  existingRound?: number;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const { active } = useAppSelector((s) => s.tournament);

  const nextRound = existingRound ?? (
    active?.pairings.length
      ? Math.max(...active.pairings.map((p) => p.round_number)) + 1
      : 1
  );

  const [round, setRound] = useState(String(nextRound));
  const [opponent, setOpponent] = useState(
    existingRound
      ? active?.pairings.find((p) => p.round_number === existingRound)?.opponent_name ?? ""
      : ""
  );
  const [color, setColor] = useState<"white" | "black" | "">(
    existingRound
      ? (active?.pairings.find((p) => p.round_number === existingRound)?.color ?? "")
      : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!opponent.trim() || !round) return;
    setSubmitting(true);
    setErr(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await dispatch(
        upsertPairing({
          tournamentId,
          pairing: {
            round_number: Number(round),
            opponent_name: opponent.trim(),
            color,
            result: "",
          },
        })
      );
      if (result?.errors) {
        setErr(String(result.errors));
      } else {
        onClose();
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save pairing");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-dark-border dark:bg-dark-surface/60">
      <div className="flex gap-2">
        <div className="w-20 shrink-0">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Round</label>
          <input
            type="number"
            min="1"
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Opponent</label>
          <input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="Opponent name"
            autoFocus
            className="block w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>
        <div className="w-28 shrink-0">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Color</label>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value as "white" | "black" | "")}
            className="block w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100"
          >
            <option value="">Unknown</option>
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </div>
      </div>
      {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !opponent.trim()}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save pairing"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Active Tournament View ────────────────────────────────────────────────────

function ActiveTournamentView() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { active } = useAppSelector((s) => s.tournament);
  const [showPairingForm, setShowPairingForm] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  if (!active) return null;

  const nextPairing = getNextPairing(active.pairings);
  const hasResult = nextPairing?.result;
  const hasChessResultsUrl = active.url.includes("chess-results.com");

  async function handlePrepare() {
    if (!nextPairing) return;
    setPreparing(true);
    setPrepError(null);
    try {
      const slug = await prepareOpponent({ name: nextPairing.opponent_name, fide_id: null, federation: null });
      router.push(getPreparedPlayerImportHref(slug));
    } catch (e: any) {
      setPrepError(e?.message ?? "Failed to open prep");
    } finally {
      setPreparing(false);
    }
  }

  function handleClose() {
    if (!active) return;
    if (!confirmClose) {
      setConfirmClose(true);
      return;
    }
    dispatch(closeTournament(active.id));
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900/50 dark:bg-brand-950/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            Active Tournament
          </p>
          <h2 className="mt-0.5 truncate text-base font-bold text-gray-900 dark:text-gray-100">
            {active.url ? (
              <a
                href={active.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {active.name}
              </a>
            ) : (
              active.name
            )}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasChessResultsUrl && (
            <Link
              href="/tournament/players"
              className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-400 dark:hover:bg-brand-900/40"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
              </svg>
              View Players
            </Link>
          )}
          <button
            type="button"
            onClick={handleClose}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              confirmClose
                ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
            onBlur={() => setConfirmClose(false)}
          >
            {confirmClose ? "Confirm end" : "End tournament"}
          </button>
        </div>
      </div>

      {/* Next opponent */}
      {nextPairing ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {hasResult ? "Last round" : "Next opponent"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {nextPairing.opponent_name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Round {nextPairing.round_number}</span>
                {nextPairing.color && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full border border-gray-300 ${
                          nextPairing.color === "white"
                            ? "bg-white dark:bg-gray-200"
                            : "bg-gray-800 dark:bg-dark-bg"
                        }`}
                      />
                      {COLOR_LABEL[nextPairing.color]}
                    </span>
                  </>
                )}
                {hasResult && (
                  <>
                    <span>·</span>
                    <span className={RESULT_LABELS[nextPairing.result]?.className ?? ""}>
                      {RESULT_LABELS[nextPairing.result]?.label ?? nextPairing.result}
                    </span>
                  </>
                )}
              </div>
            </div>

            {!hasResult && (
              <button
                type="button"
                onClick={handlePrepare}
                disabled={preparing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {preparing ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Opening…
                  </>
                ) : (
                  "Prepare →"
                )}
              </button>
            )}
          </div>
          {prepError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{prepError}</p>}
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No pairings yet. Add your first round pairing below.
        </p>
      )}

      {/* Pairing form or trigger */}
      {showPairingForm ? (
        <PairingForm
          tournamentId={active.id}
          onClose={() => setShowPairingForm(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowPairingForm(true)}
          className="mt-3 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          {active.pairings.length === 0 ? "+ Add pairing" : "↻ Update pairing"}
        </button>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function TournamentPanel() {
  const dispatch = useAppDispatch();
  const { active, initialized } = useAppSelector((s) => s.tournament);
  const { token } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (token && !initialized) {
      dispatch(fetchActiveTournament());
    }
  }, [dispatch, token, initialized]);

  if (!token) return null;

  if (!initialized) return null;

  return (
    <div className="mb-6">
      {active ? <ActiveTournamentView /> : <CreateTournamentForm />}
    </div>
  );
}
