"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useActiveImports } from "@/components/import/ActiveImportsProvider";
import {
  federationOf,
  queryIsSearchable,
  ratingOf,
  useFideSearch,
} from "./useFideSearch";
import type { Player, PlayerLookupResult } from "@/types";

/**
 * The home page search: one box, two sources, answered in a dropdown.
 *
 * Your own opponents come first because they are what you usually want, then
 * a FIDE section for everyone else. Both live in the dropdown rather than in
 * page sections — FIDE below the fold was easy to miss entirely, which
 * defeated the point of searching it at all.
 *
 * FIDE is searched alongside your opponents, not as a fallback when they come
 * back empty: search "john", match one John you already added, and the John
 * you were actually looking for would be unreachable.
 */

const MAX_LOCAL = 6;

function SectionLabel({
  children,
  strong,
}: {
  children: React.ReactNode;
  /** The FIDE heading carries more weight — it is the half people miss. */
  strong?: boolean;
}) {
  return (
    <p
      className={`px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wider ${
        strong
          ? "text-gray-800 dark:text-gray-200"
          : "text-gray-500 dark:text-gray-400"
      }`}
    >
      {children}
    </p>
  );
}

function Row({
  title,
  meta,
  action,
  onClick,
  disabled,
}: {
  title: React.ReactNode;
  meta: React.ReactNode;
  action?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-brand-50 focus:bg-brand-50 focus:outline-none disabled:opacity-60 dark:hover:bg-brand-900/20 dark:focus:bg-brand-900/20"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
          {meta}
        </span>
      </span>
      {action && (
        <span className="shrink-0 text-xs font-semibold text-brand-600 dark:text-brand-400">
          {action}
        </span>
      )}
    </button>
  );
}

export function OpponentSearch({
  query,
  onQueryChange,
  localResults,
  localLoading,
  onPlayerCreated,
  className = "",
}: {
  query: string;
  onQueryChange: (q: string) => void;
  /** The list page's own results — already filtered server-side by `query`. */
  localResults: Player[];
  localLoading?: boolean;
  onPlayerCreated?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const { refresh: refreshActiveImports } = useActiveImports();
  const [open, setOpen] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const { results: fideResults, searching, error: fideError } = useFideSearch(query);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const ownedFideIds = new Set(
    localResults.map((p) => p.fide_id).filter((id): id is string => !!id)
  );

  const add = useCallback(
    async (result: PlayerLookupResult) => {
      const fideId = result.fide_id;
      if (!fideId || addingId) return;

      setAddingId(fideId);
      setAddError(null);
      try {
        // Open what we already hold rather than making a second copy of it.
        // This is not the duplicate-detection feature — it is the one case
        // that is free to check, because the ID is an exact key.
        const existing = await api.getPlayers(fideId);
        const match = existing.results.find((p) => p.fide_id === fideId);
        if (match) {
          setOpen(false);
          router.push(`/players/${match.slug}`);
          return;
        }

        const player = await api.createPlayer({
          full_name: result.display_name,
          fide_id: fideId,
          federation: federationOf(result),
        });

        // Start pulling their games immediately, so the profile has something
        // on it by the time it finishes opening.
        try {
          await api.createCareerImportJob(player.slug, fideId);
          // Let the pill pick the job up now rather than up to three seconds
          // later, so the profile knows to refetch when it finishes.
          refreshActiveImports();
        } catch {
          // The profile exists either way; let them import by hand rather than
          // stranding a half-made player behind an error.
        }

        onPlayerCreated?.();
        setOpen(false);
        router.push(`/players/${player.slug}`);
      } catch (err) {
        const message =
          (err as { body?: { detail?: string } })?.body?.detail ??
          (err as Error)?.message ??
          "Could not add this player.";
        setAddError(message);
      } finally {
        setAddingId(null);
      }
    },
    [addingId, onPlayerCreated, refreshActiveImports, router]
  );

  const trimmed = query.trim();
  const localShown = localResults.slice(0, MAX_LOCAL);
  const showDropdown = open && trimmed.length > 0;
  const fideSearchable = queryIsSearchable(trimmed);

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search your opponents, or FIDE by name or ID…"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="opponent-search-results"
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-elevated dark:text-gray-100 dark:placeholder-gray-500"
        />
      </div>

      {showDropdown && (
        <div
          id="opponent-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-dark-border dark:bg-dark-surface"
        >
          <SectionLabel>Your opponents</SectionLabel>
          {localShown.length > 0 ? (
            localShown.map((p) => (
              <Row
                key={p.id}
                title={p.full_name}
                meta={
                  [
                    p.title,
                    p.federation,
                    p.fide_id ? `FIDE #${p.fide_id}` : null,
                    p.standard_rating ? `${p.standard_rating}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No rating on file"
                }
                action="Open"
                onClick={() => {
                  setOpen(false);
                  router.push(`/players/${p.slug}`);
                }}
              />
            ))
          ) : (
            <p className="px-3 pb-2 text-sm text-gray-500 dark:text-gray-400">
              {localLoading ? "Searching…" : "None of yours match."}
            </p>
          )}

          {/* FIDE gets its own heading so it cannot be mistaken for more of
              your own list — these are people you do not have yet. */}
          <div className="mt-1 border-t border-gray-100 dark:border-dark-border">
            <div className="flex items-baseline gap-2">
              <SectionLabel strong>FIDE</SectionLabel>
              {searching && (
                <span className="pt-3 text-xs text-gray-400 dark:text-gray-500">searching…</span>
              )}
            </div>

            {!fideSearchable && (
              <p className="px-3 pb-2 text-sm text-gray-500 dark:text-gray-400">
                Keep typing to search FIDE by name, or enter a FIDE ID.
              </p>
            )}

            {fideSearchable && fideError && (
              <p className="px-3 pb-2 text-sm text-red-600 dark:text-red-400">{fideError}</p>
            )}

            {fideSearchable && !searching && !fideError && fideResults?.length === 0 && (
              <p className="px-3 pb-2 text-sm text-gray-500 dark:text-gray-400">
                No FIDE player matches “{trimmed}”.
              </p>
            )}

            {fideResults?.map((r) => {
              const fideId = r.fide_id ?? "";
              const rating = ratingOf(r);
              return (
                <Row
                  key={fideId || r.display_name}
                  title={
                    <>
                      {r.title && (
                        <span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">
                          {r.title}
                        </span>
                      )}
                      {r.display_name}
                    </>
                  }
                  meta={
                    [
                      federationOf(r),
                      fideId ? `FIDE #${fideId}` : null,
                      rating != null ? `${rating}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  }
                  action={
                    addingId === fideId
                      ? "Adding…"
                      : ownedFideIds.has(fideId)
                        ? "Open"
                        : "+ Add"
                  }
                  disabled={!!addingId}
                  onClick={() => add(r)}
                />
              );
            })}

            {addError && (
              <p className="px-3 pb-2 pt-1 text-sm text-red-600 dark:text-red-400">{addError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
