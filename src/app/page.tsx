"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { PlayerCard } from "@/components/players/PlayerCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { api } from "@/lib/api";
import { DEMO_PLAYER_SLUG, MY_PLAYERS_KEY } from "@/lib/constants";
import type { Player, PlayerDetail } from "@/types";

function AddOpponentCard() {
  return (
    <Link
      href="/players/new"
      className="group flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center transition-all hover:border-brand-300 hover:bg-brand-50/30"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-2xl text-gray-400 transition-colors group-hover:border-brand-400 group-hover:text-brand-500">
        +
      </div>
      <p className="text-sm font-semibold text-gray-600 group-hover:text-brand-600">
        Add Opponent
      </p>
      <p className="mt-1 text-xs text-gray-400">Create a new opponent profile</p>
    </Link>
  );
}

export default function HomePage() {
  const [demoPlayer, setDemoPlayer] = useState<PlayerDetail | null>(null);
  const [myPlayers, setMyPlayers] = useState<PlayerDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlayers() {
      setLoading(true);

      // Always fetch demo player
      const demoPromise = api.getPlayerDetail(DEMO_PLAYER_SLUG).catch(() => null);

      // Fetch saved opponents from localStorage
      let savedSlugs: string[] = [];
      try {
        const raw = localStorage.getItem(MY_PLAYERS_KEY);
        savedSlugs = raw ? (JSON.parse(raw) as string[]) : [];
      } catch {
        savedSlugs = [];
      }
      // Filter out demo slug to avoid duplicates
      const uniqueSlugs = savedSlugs.filter((s) => s !== DEMO_PLAYER_SLUG);

      const [demo, ...playerResults] = await Promise.all([
        demoPromise,
        ...uniqueSlugs.map((slug) => api.getPlayerDetail(slug).catch(() => null)),
      ]);

      setDemoPlayer(demo as PlayerDetail | null);
      setMyPlayers(
        playerResults.filter((p): p is PlayerDetail => p !== null)
      );
      setLoading(false);
    }

    loadPlayers();
  }, []);

  const allPlayers: PlayerDetail[] = [
    ...(demoPlayer ? [demoPlayer] : []),
    ...myPlayers,
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Scouting
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">My Opponents</h1>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allPlayers.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
          <AddOpponentCard />
        </div>
      )}
    </div>
  );
}
