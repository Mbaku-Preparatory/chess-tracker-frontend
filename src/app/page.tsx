"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";

import { PlayerCard } from "@/components/players/PlayerCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPlayers, setSearchQuery } from "@/store/slices/playersSlice";

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { items, loading, searchQuery } = useAppSelector((state) => state.players);

  useEffect(() => {
    dispatch(fetchPlayers({}));
  }, [dispatch]);

  const handleSearch = useCallback(
    (query: string) => {
      dispatch(setSearchQuery(query));
      dispatch(fetchPlayers({ search: query || undefined }));
    },
    [dispatch]
  );

  return (
    <div>
      <section className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(12,147,231,0.2),_transparent_38%),linear-gradient(180deg,#020617_0%,#0f172a_58%,#111827_100%)] px-6 py-10 text-white shadow-2xl sm:px-10 sm:py-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-200">
          Opponent Intelligence
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
          Search your opponent. Walk in prepared.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          Mbaku Preparatory turns each opponent into a scouting dossier — colour splits,
          opening tendencies, win conditions, and a match plan ready before you sit down.
        </p>

        <div className="mt-8 max-w-xl">
          <SearchInput
            placeholder="Search your opponent..."
            onSearch={handleSearch}
            defaultValue={searchQuery}
            className="[&>input]:border-white/10 [&>input]:bg-white [&>input]:text-gray-900 [&>input]:placeholder:text-gray-400"
          />
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Scouting Reports
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">Available prep</h2>
          </div>
          <Link href="/players" className="btn-secondary text-sm">
            Browse all players
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No players found"
            description={
              searchQuery
                ? "Try a different name or federation."
                : "Seed players to populate the database."
            }
          />
        )}
      </section>
    </div>
  );
}
