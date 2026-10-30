"use client";

import { useState } from "react";

import { api } from "@/lib/api";

/**
 * Deletes one of a scouted player's games, after a second click to confirm.
 * The games table's row action in the app.
 */
export function DeleteGameButton({ gameRef, onDeleted }: { gameRef: string; onDeleted: (gameRef: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      await api.deleteGame(gameRef);
      onDeleted(gameRef);
    } catch {
      // Left in place: the button is still there to try again.
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="rounded-pill bg-red-600 px-2.5 py-1 text-[12px] font-[520] text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-pill px-2 py-1 text-[12px] text-ink-faint hover:text-ink-text">
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      title="Delete game"
      aria-label="Delete game"
      className="rounded-pill p-1.5 text-ink-faint hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </button>
  );
}
