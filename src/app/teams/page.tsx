"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchTeams } from "@/store/slices/teamsSlice";
import type { Team } from "@/types";

function CreateTeamModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (team: Team) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const team = await api.createTeam({ name: name.trim(), description: description.trim() });
      onCreated(team);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create team.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-dark-surface">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">New Team</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Team name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Equity Chess Club"
              className="input w-full"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes about this team or upcoming match..."
              rows={3}
              className="input w-full resize-none"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving || !name.trim()} className="btn-primary flex-1">
              {saving ? "Creating…" : "Create Team"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeamCard({ team, onDeleted }: { team: Team; onDeleted: (team: Team) => void }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!window.confirm(`Delete team "${team.name}"? Players will not be deleted.`)) return;
    setDeleting(true);
    try {
      await api.deleteTeam(team.slug);
      onDeleted(team);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Link
      href={`/teams/${team.slug}`}
      className="card group flex items-center justify-between gap-4 border-gray-200 px-5 py-4 transition-colors hover:border-brand-200 dark:hover:border-brand-700"
    >
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-gray-900 group-hover:text-brand-700 dark:text-gray-100 dark:group-hover:text-brand-400">
          {team.name}
        </h3>
        {team.description && (
          <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
            {team.description}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {team.player_count} {team.player_count === 1 ? "player" : "players"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs font-medium text-brand-600 dark:text-brand-400 sm:inline">
          View →
        </span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          title="Delete team"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </Link>
  );
}

export default function TeamsPage() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((s) => s.teams);
  const [showCreate, setShowCreate] = useState(false);
  const [localItems, setLocalItems] = useState<Team[]>([]);

  useEffect(() => {
    dispatch(fetchTeams());
  }, [dispatch]);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  function handleCreated(team: Team) {
    setLocalItems((prev) => [team, ...prev]);
    setShowCreate(false);
  }

  function handleDeleted(team: Team) {
    setLocalItems((prev) => prev.filter((t) => t.id !== team.id));
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Scouting
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">My Teams</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + New Team
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card border-gray-200 px-5 py-4">
              <div className="h-5 w-48 animate-pulse rounded bg-gray-200 dark:bg-dark-elevated" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-gray-100 dark:bg-dark-surface" />
            </div>
          ))}
        </div>
      ) : localItems.length > 0 ? (
        <div className="space-y-3">
          {localItems.map((team) => (
            <TeamCard key={team.id} team={team} onDeleted={handleDeleted} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-dark-border">
          <p className="text-base font-semibold text-gray-500 dark:text-gray-400">No teams yet</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Create a team to group players you&apos;ll face together, e.g. a rival club.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
            + New Team
          </button>
        </div>
      )}

      {showCreate && (
        <CreateTeamModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
