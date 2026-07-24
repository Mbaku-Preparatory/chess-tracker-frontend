"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { PlayerCard } from "@/components/players/PlayerCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchPlayers,
  setSearchQuery,
  setOrdering,
  setCurrentPage,
  type PlayerOrdering,
} from "@/redux/actions/players";
import { fetchTeams } from "@/redux/actions/teams";
import { api } from "@/lib/api";
import type { Player, Team } from "@/types";

const PAGE_SIZE = 25;
const PLAYER_VIEW_STORAGE_KEY = "players_view_mode";
const PLAYER_ORDERING_STORAGE_KEY = "players_ordering";

const VALID_ORDERINGS = new Set(["-created_at", "created_at", "full_name", "-standard_rating"]);

type PlayerViewMode = "card" | "list";

const SORT_OPTIONS: { value: PlayerOrdering; label: string }[] = [
  { value: "-created_at",      label: "Recently added" },
  { value: "created_at",       label: "Oldest first" },
  { value: "full_name",        label: "Name A–Z" },
  { value: "-standard_rating", label: "Highest rated" },
];

// ── Accordion ─────────────────────────────────────────────────────────────────

function Accordion({
  label,
  badge,
  defaultOpen = true,
  action,
  children,
}: {
  label: string;
  badge?: number;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{label}</span>
          {badge !== undefined && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-dark-elevated dark:text-gray-400">
              {badge}
            </span>
          )}
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

// ── Teams Section ─────────────────────────────────────────────────────────────

function TeamsSection() {
  const { items, loading, error } = useAppSelector((s) => s.teams);
  const [localItems, setLocalItems] = useState<Team[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  function handleDeleted(team: Team) {
    setLocalItems((prev) => prev.filter((t) => t.id !== team.id));
  }

  function handleCreated(team: Team) {
    setLocalItems((prev) => [team, ...prev]);
    setShowCreate(false);
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
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
            <TeamRow key={team.id} team={team} onDeleted={handleDeleted} />
          ))}
          <button
            onClick={() => setShowCreate(true)}
            className="group flex w-full items-center justify-between rounded-xl border border-dashed border-gray-300 bg-white px-5 py-4 transition hover:border-brand-300 hover:bg-brand-50/30 dark:border-dark-border dark:bg-dark-surface dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
          >
            <span className="text-sm font-medium text-gray-500 group-hover:text-brand-600 dark:text-gray-400 dark:group-hover:text-brand-400">
              + New Team
            </span>
          </button>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center dark:border-dark-border">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No teams yet</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Create a team to group opponents you&apos;ll face together.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 text-sm">
            + New Team
          </button>
        </div>
      )}
      {showCreate && (
        <CreateTeamModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </>
  );
}

function TeamRow({ team, onDeleted }: { team: Team; onDeleted: (team: Team) => void }) {
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
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
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

// ── Opponent list helpers ──────────────────────────────────────────────────────

function AddOpponentCard() {
  return (
    <Link
      href="/players/new"
      className="group flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center transition-all hover:border-brand-300 hover:bg-brand-50/30 dark:border-dark-border dark:bg-dark-surface dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-2xl text-gray-400 transition-colors group-hover:border-brand-400 group-hover:text-brand-500 dark:border-dark-border dark:text-gray-500">
        +
      </div>
      <p className="text-sm font-semibold text-gray-600 group-hover:text-brand-600 dark:text-gray-400 dark:group-hover:text-brand-400">
        Add Opponent
      </p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Create a new opponent profile</p>
    </Link>
  );
}

function AddOpponentListRow() {
  return (
    <Link
      href="/players/new"
      className="group flex items-center justify-between rounded-xl border border-dashed border-gray-300 bg-white px-5 py-4 transition-all hover:border-brand-300 hover:bg-brand-50/30 dark:border-dark-border dark:bg-dark-surface dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-2xl text-gray-400 transition-colors group-hover:border-brand-400 group-hover:text-brand-500 dark:border-dark-border dark:text-gray-500">
          +
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 group-hover:text-brand-700 dark:text-gray-300 dark:group-hover:text-brand-400">
            Add Opponent
          </p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            Create a new opponent profile
          </p>
        </div>
      </div>
      <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
        New →
      </span>
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="card border-gray-200 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-200 dark:bg-dark-elevated" />
          <div className="min-w-0 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-dark-elevated" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-dark-surface" />
            <div className="h-3 w-56 animate-pulse rounded bg-gray-100 dark:bg-dark-surface" />
          </div>
        </div>
        <div className="h-10 w-28 animate-pulse rounded-lg bg-gray-200 dark:bg-dark-elevated" />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { items, total, loading, error, searchQuery, ordering, currentPage } =
    useAppSelector((s) => s.players);
  const { items: teamItems } = useAppSelector((s) => s.teams);
  const [viewMode, setViewMode] = useState<PlayerViewMode>("list");

  useEffect(() => {
    dispatch(fetchPlayers({ search: searchQuery || undefined, page: currentPage, ordering }));
  }, [dispatch, searchQuery, currentPage, ordering]);

  useEffect(() => {
    dispatch(fetchTeams());
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedMode = window.localStorage.getItem(PLAYER_VIEW_STORAGE_KEY);
    if (savedMode === "card" || savedMode === "list") setViewMode(savedMode);
    const savedOrdering = window.localStorage.getItem(PLAYER_ORDERING_STORAGE_KEY);
    if (savedOrdering && VALID_ORDERINGS.has(savedOrdering)) {
      dispatch(setOrdering(savedOrdering as PlayerOrdering));
    }
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PLAYER_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PLAYER_ORDERING_STORAGE_KEY, ordering);
  }, [ordering]);

  const handleSearch = useCallback(
    (query: string) => {
      dispatch(setSearchQuery(query));
    },
    [dispatch]
  );

  const handlePlayerDeleted = useCallback(
    (_player: Player) => {
      dispatch(fetchPlayers({ search: searchQuery || undefined, page: currentPage, ordering }));
    },
    [dispatch, searchQuery, currentPage, ordering]
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
          Scouting
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
      </div>

      {/* Teams accordion — collapsed by default */}
      <Accordion
        label="My Teams"
        badge={teamItems.length || undefined}
        defaultOpen={false}
      >
        <TeamsSection />
      </Accordion>

      {/* Players accordion — open by default */}
      <Accordion
        label="My Opponents"
        badge={total || undefined}
        defaultOpen={true}
        action={
          <Link href="/players/new" className="btn-primary text-sm py-1.5 px-3">
            + Add Opponent
          </Link>
        }
      >
        {/* Search + sort */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            placeholder="Search by name or federation…"
            onSearch={handleSearch}
            defaultValue={searchQuery}
            className="max-w-xl flex-1"
          />
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 dark:border-dark-border dark:bg-dark-surface">
              {([
                {
                  value: "list" as const,
                  label: "List",
                  icon: (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M3 4.5A1.5 1.5 0 114.5 6 1.5 1.5 0 013 4.5zm0 5A1.5 1.5 0 114.5 11 1.5 1.5 0 013 9.5zm0 5A1.5 1.5 0 114.5 16 1.5 1.5 0 013 14.5zM7 5h10v2H7V5zm0 5h10v2H7v-2zm0 5h10v2H7v-2z" />
                    </svg>
                  ),
                },
                {
                  value: "card" as const,
                  label: "Cards",
                  icon: (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" />
                    </svg>
                  ),
                },
              ]).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setViewMode(option.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === option.value
                      ? "bg-brand-600 text-white"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-dark-elevated dark:hover:text-gray-200"
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => dispatch(setOrdering(opt.value))}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    ordering === opt.value
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-elevated dark:text-gray-300 dark:hover:bg-dark-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          viewMode === "card" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ListSkeleton key={i} />
              ))}
            </div>
          )
        ) : items.length > 0 ? (
          <>
            {viewMode === "card" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    showDelete
                    onDeleted={handlePlayerDeleted}
                  />
                ))}
                <AddOpponentCard />
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    showDelete
                    onDeleted={handlePlayerDeleted}
                    variant="list"
                  />
                ))}
                <AddOpponentListRow />
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => dispatch(setCurrentPage(currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 text-sm text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => dispatch(setCurrentPage(currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title={searchQuery ? "No opponents found" : "No opponents yet"}
            description={
              searchQuery
                ? "Try adjusting your search."
                : "Add your first opponent to get started."
            }
          />
        )}
      </Accordion>
    </div>
  );
}
