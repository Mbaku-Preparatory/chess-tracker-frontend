"use client";

import Link from "next/link";
import { useState } from "react";

import { api } from "@/lib/api";
import { getPrepProductName, getPrimaryRating } from "@/lib/marketplace";
import type { Player } from "@/types";

function GameSourcePills({ player }: { player: Player }) {
  const sc = player.game_source_counts;
  const otb = sc?.chess_results ?? 0;
  const cc  = sc?.chess_com   ?? 0;
  const li  = sc?.lichess     ?? 0;
  const total = (sc ? Object.values(sc).reduce((a, b) => a + b, 0) : player.games_count) ?? 0;

  if (!total) return null;

  if (!otb && !cc && !li) {
    return <span>{total} games</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {otb > 0 && (
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          {otb} OTB
        </span>
      )}
      {cc > 0 && (
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#7fa650]" />
          {cc} Chess.com
        </span>
      )}
      {li > 0 && (
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#b05000]" />
          {li} Lichess
        </span>
      )}
    </span>
  );
}

interface PlayerCardProps {
  player: Player;
  showDelete?: boolean;
  onDeleted?: (player: Player) => void;
  variant?: "card" | "list";
}

export function PlayerCard({
  player,
  showDelete = false,
  onDeleted,
  variant = "card",
}: PlayerCardProps) {
  const playerRef = player.public_id || player.slug;
  const initials = player.full_name
    .split(" ")
    .map((name) => name[0])
    .join("");
  const rating = getPrimaryRating(player);
  const productName = getPrepProductName(player);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete player profile "${player.full_name}"? This will permanently remove the player, linked accounts, imported games, and derived stats.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await api.deletePlayer(playerRef);
      onDeleted?.(player);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete player.");
    } finally {
      setDeleting(false);
    }
  }

  if (variant === "list") {
    return (
      <div className="card overflow-hidden border-gray-200 px-5 py-4 transition-colors hover:border-brand-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-base font-bold text-brand-700">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                  {player.full_name}
                </h3>
                {player.title && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800">
                    {player.title}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm font-medium text-brand-700">{productName}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                {player.federation && <span>{player.federation}</span>}
                {rating && <span>Rating {rating}</span>}
                <GameSourcePills player={player} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:flex-nowrap">
            <Link href={`/players/${playerRef}`} className="btn-primary text-sm">
              View Profile
            </Link>
            {showDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                title="Delete player profile"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {deleteError && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deleteError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card group overflow-hidden border-gray-200 p-0 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg">
      <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top,_rgba(12,147,231,0.12),_transparent_55%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-6 dark:border-gray-700 dark:bg-none dark:bg-gray-800/80">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-xl font-bold text-brand-700">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {player.full_name}
                </h3>
                {player.title && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800">
                    {player.title}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-brand-700">{productName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                {player.federation && <span>{player.federation}</span>}
                {rating && <span>Rating {rating}</span>}
                <GameSourcePills player={player} />
              </div>
            </div>
          </div>

          <div className="flex items-start">
            {showDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                title="Delete player profile"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 px-6 py-5">
        <Link href={`/players/${playerRef}`} className="btn-primary flex-1">
          View Profile
        </Link>
      </div>

      {deleteError && (
        <div className="border-t border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}
    </div>
  );
}
