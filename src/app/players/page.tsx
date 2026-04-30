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

// ── Lichess Practice ──────────────────────────────────────────────────────────

const PRACTICE_CATEGORIES = [
  {
    name: "Checkmates",
    items: [
      { title: "Piece Checkmates I",     sub: "Basic checkmates",           path: "/practice/checkmates/piece-checkmates-i/BJy6fEDf" },
      { title: "Checkmate Patterns I",   sub: "Recognize the patterns",     path: "/practice/checkmates/checkmate-patterns-i/fE4k21MW" },
      { title: "Checkmate Patterns II",  sub: "Recognize the patterns",     path: "/practice/checkmates/checkmate-patterns-ii/8yadFPpU" },
      { title: "Checkmate Patterns III", sub: "Recognize the patterns",     path: "/practice/checkmates/checkmate-patterns-iii/PDkQDt6u" },
      { title: "Checkmate Patterns IV",  sub: "Recognize the patterns",     path: "/practice/checkmates/checkmate-patterns-iv/96Lij7wH" },
      { title: "Piece Checkmates II",    sub: "Challenging checkmates",     path: "/practice/checkmates/piece-checkmates-ii/Rg2cMBZ6" },
      { title: "Knight & Bishop Mate",   sub: "Interactive lesson",         path: "/practice/checkmates/knight--bishop-mate/ByhlXnmM" },
    ],
  },
  {
    name: "Fundamental Tactics",
    items: [
      { title: "The Pin",             sub: "Pin it to win it",                    path: "/practice/fundamental-tactics/the-pin/9ogFv8Ac" },
      { title: "The Skewer",          sub: "Yum — skewers!",                      path: "/practice/fundamental-tactics/the-skewer/tuoBxVE5" },
      { title: "The Fork",            sub: "Use the fork, Luke",                  path: "/practice/fundamental-tactics/the-fork/Qj281y1p" },
      { title: "Discovered Attacks",  sub: "Including discovered checks",         path: "/practice/fundamental-tactics/discovered-attacks/MnsJEWnI" },
      { title: "Double Check",        sub: "A very powerful tactic",              path: "/practice/fundamental-tactics/double-check/RUQASaZm" },
      { title: "Overloaded Pieces",   sub: "They have too much work",             path: "/practice/fundamental-tactics/overloaded-pieces/o734CNqp" },
      { title: "Zwischenzug",         sub: "In-between moves",                    path: "/practice/fundamental-tactics/zwischenzug/ITWY4GN2" },
      { title: "X-Ray",               sub: "Attacking through an enemy piece",    path: "/practice/fundamental-tactics/x-ray/lyVYjhPG" },
    ],
  },
  {
    name: "Advanced Tactics",
    items: [
      { title: "Zugzwang",        sub: "Being forced to move",                        path: "/practice/advanced-tactics/zugzwang/9cKgYrHb" },
      { title: "Interference",    sub: "Interpose a piece to great effect",           path: "/practice/advanced-tactics/interference/g1fxVZu9" },
      { title: "Greek Gift",      sub: "Study the Greek gift sacrifice",              path: "/practice/advanced-tactics/greek-gift/s5pLU7Of" },
      { title: "Deflection",      sub: "Distracting a defender",                     path: "/practice/advanced-tactics/deflection/kdKpaYLW" },
      { title: "Attraction",      sub: "Lure a piece to a bad square",               path: "/practice/advanced-tactics/attraction/jOZejFWk" },
      { title: "Underpromotion",  sub: "Promote — but not to a queen!",              path: "/practice/advanced-tactics/underpromotion/49fDW0wP" },
      { title: "Desperado",       sub: "A piece is lost, but it can still help",     path: "/practice/advanced-tactics/desperado/0YcGiH4Y" },
      { title: "Counter Check",   sub: "Respond to a check with a check",            path: "/practice/advanced-tactics/counter-check/CgjKPvxQ" },
      { title: "Undermining",     sub: "Remove the defending piece",                 path: "/practice/advanced-tactics/undermining/udx042D6" },
      { title: "Clearance",       sub: "Get out of the way!",                        path: "/practice/advanced-tactics/clearance/Grmtwuft" },
    ],
  },
  {
    name: "Pawn Endgames",
    items: [
      { title: "Key Squares",         sub: "Reach a key square",          path: "/practice/pawn-endgames/key-squares/xebrDvFe" },
      { title: "Opposition",          sub: "Take the opposition",         path: "/practice/pawn-endgames/opposition/A4ujYOer" },
      { title: "7th-Rank Rook Pawn",  sub: "Versus a Queen",              path: "/practice/pawn-endgames/7th-rank-rook-pawn/pt20yRkT" },
    ],
  },
  {
    name: "Rook Endgames",
    items: [
      { title: "7th-Rank Rook Pawn",       sub: "And Passive Rook vs Rook",        path: "/practice/rook-endgames/7th-rank-rook-pawn/MkDViieT" },
      { title: "Basic Rook Endgames",      sub: "Lucena and Philidor",             path: "/practice/rook-endgames/basic-rook-endgames/pqUSUw8Y" },
      { title: "Intermediate Rook Endings", sub: "Broaden your knowledge",         path: "/practice/rook-endgames/intermediate-rook-endings/heQDnvq7" },
      { title: "Practical Rook Endings",   sub: "Rook endings with several pawns", path: "/practice/rook-endgames/practical-rook-endings/wS23j5Tm" },
    ],
  },
] as const;

function LichessPractice() {
  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Structured practice modules from{" "}
        <a
          href="https://lichess.org/practice"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 hover:underline dark:text-brand-400"
        >
          lichess.org/practice
        </a>
        . Opens directly in Lichess.
      </p>
      {PRACTICE_CATEGORIES.map((cat) => (
        <div key={cat.name}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            {cat.name}
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {cat.items.map((item) => (
              <a
                key={item.path}
                href={`https://lichess.org${item.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition hover:border-brand-200 hover:bg-brand-50/30 dark:border-dark-border dark:bg-dark-surface dark:hover:border-brand-700 dark:hover:bg-brand-900/20"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800 group-hover:text-brand-700 dark:text-gray-200 dark:group-hover:text-brand-400">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-gray-400 dark:text-gray-500">{item.sub}</p>
                </div>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3.5 w-3.5 shrink-0 text-gray-300 transition group-hover:text-brand-500 dark:text-gray-600"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                    clipRule="evenodd"
                  />
                  <path
                    fillRule="evenodd"
                    d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            ))}
          </div>
        </div>
      ))}
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

      {/* Lichess Practice accordion — collapsed by default */}
      <Accordion label="Practice" defaultOpen={false}>
        <LichessPractice />
      </Accordion>

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
