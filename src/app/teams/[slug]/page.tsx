"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

import { api } from "@/lib/api";
import { getPrepProductName, getPrimaryRating } from "@/lib/marketplace";
import type { Player, TeamDetail } from "@/types";

function TeamPlayerRow({
  player,
  onRemove,
  removing,
}: {
  player: Player;
  onRemove: (player: Player) => void;
  removing: boolean;
}) {
  const playerRef = player.public_id || player.slug;
  const initials = player.full_name.split(" ").map((n) => n[0]).join("");
  const rating = getPrimaryRating(player);
  const productName = getPrepProductName(player);

  return (
    <div className="card overflow-hidden border-gray-200 px-5 py-4 transition-colors hover:border-brand-200 dark:hover:border-brand-700">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-base font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                {player.full_name}
              </h3>
              {player.title && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                  {player.title}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm font-medium text-brand-700 dark:text-brand-400">{productName}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              {player.federation && <span>{player.federation}</span>}
              {rating && <span>Rating {rating}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:flex-nowrap">
          <Link href={`/players/${playerRef}`} className="btn-primary text-sm">
            View Profile
          </Link>
          <button
            type="button"
            onClick={() => onRemove(player)}
            disabled={removing}
            title="Remove from team"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function AddPlayerModal({
  teamSlug,
  alreadyIn,
  onClose,
  onAdded,
}: {
  teamSlug: string;
  alreadyIn: number[];
  onClose: () => void;
  onAdded: (team: TeamDetail) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await api.getPlayers(search || undefined, 1);
        if (!cancelled) setResults(res.results);
      } finally {
        if (!cancelled) setLoadingSearch(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  async function handleAdd(player: Player) {
    const ref = player.public_id || player.slug;
    setAdding(ref);
    setError(null);
    try {
      const updated = await api.addPlayerToTeam(teamSlug, ref);
      onAdded(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add player.");
    } finally {
      setAdding(null);
    }
  }

  const available = results.filter((p) => !alreadyIn.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl dark:bg-dark-surface">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-dark-border">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Add Player to Team</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-elevated dark:hover:text-gray-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="input w-full"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto px-6 pb-4">
          {loadingSearch ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-dark-elevated" />
              ))}
            </div>
          ) : available.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              {search ? "No matching players found." : "All your players are already in this team."}
            </p>
          ) : (
            <ul className="space-y-1">
              {available.map((player) => {
                const ref = player.public_id || player.slug;
                const initials = player.full_name.split(" ").map((n) => n[0]).join("");
                return (
                  <li key={player.id}>
                    <button
                      type="button"
                      onClick={() => handleAdd(player)}
                      disabled={adding === ref}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-brand-50 disabled:opacity-60 dark:hover:bg-brand-900/20"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {player.full_name}
                        </p>
                        {(player.federation || player.standard_rating) && (
                          <p className="text-xs text-gray-400">
                            {[player.federation, player.standard_rating && `${player.standard_rating}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                        {adding === ref ? "Adding…" : "+ Add"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="border-t border-gray-100 px-6 py-4 dark:border-dark-border">
          <button onClick={onClose} className="btn-secondary w-full">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getTeam(slug)
      .then(setTeam)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load team."))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleRemovePlayer(player: Player) {
    if (!team) return;
    const ref = player.public_id || player.slug;
    setRemovingId(player.id);
    try {
      await api.removePlayerFromTeam(team.slug, ref);
      setTeam((prev) =>
        prev ? { ...prev, players: prev.players.filter((p) => p.id !== player.id), player_count: prev.player_count - 1 } : prev
      );
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200 dark:bg-dark-elevated" />
        <div className="h-4 w-48 animate-pulse rounded bg-gray-100 dark:bg-dark-surface" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card border-gray-200 px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-200 dark:bg-dark-elevated" />
                <div className="space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-dark-elevated" />
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-dark-surface" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
        {error ?? "Team not found."}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/teams"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
          >
            ← My Teams
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Team
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{team.name}</h1>
          {team.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{team.description}</p>
          )}
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {team.player_count} {team.player_count === 1 ? "player" : "players"}
          </p>
        </div>
        <button onClick={() => setShowAddPlayer(true)} className="btn-primary">
          + Add Player
        </button>
      </div>

      {/* Players list */}
      <div className="mt-6">
        {team.players.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-dark-border">
            <p className="text-base font-semibold text-gray-500 dark:text-gray-400">No players in this team yet</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Add opponents you&apos;ll be facing together.
            </p>
            <button onClick={() => setShowAddPlayer(true)} className="btn-primary mt-4">
              + Add Player
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {team.players.map((player) => (
              <TeamPlayerRow
                key={player.id}
                player={player}
                onRemove={handleRemovePlayer}
                removing={removingId === player.id}
              />
            ))}
          </div>
        )}
      </div>

      {showAddPlayer && (
        <AddPlayerModal
          teamSlug={team.slug}
          alreadyIn={team.players.map((p) => p.id)}
          onClose={() => setShowAddPlayer(false)}
          onAdded={(updated) => {
            setTeam(updated);
            setShowAddPlayer(false);
          }}
        />
      )}
    </div>
  );
}
