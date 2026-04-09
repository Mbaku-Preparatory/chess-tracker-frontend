"use client";

import { useState } from "react";
import type { Game } from "@/types";
import { ColorBadge, EcoBadge, ResultBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PgnViewerModal } from "./PgnViewerModal";

interface GamesTableProps {
  games: Game[];
  loading?: boolean;
}

export function GamesTable({ games, loading }: GamesTableProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  if (!loading && !games.length) {
    return <EmptyState title="No games found" description="Try adjusting your filters." />;
  }

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-left">
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">Event</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">Opponent</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">Color</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">Result</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">Opening</th>
                <th className="hidden whitespace-nowrap px-4 py-3 font-semibold text-gray-600 sm:table-cell">ECO</th>
                <th className="hidden whitespace-nowrap px-4 py-3 font-semibold text-gray-600 sm:table-cell">Moves</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {games.map((game) => (
                <tr
                  key={game.id}
                  onClick={() => setSelectedGame(game)}
                  className="cursor-pointer transition-colors hover:bg-brand-50/60 active:bg-brand-50"
                  title="Click to view game"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                    {game.date_played
                      ? new Date(game.date_played).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-gray-900">
                    {game.event}
                    {game.round && (
                      <span className="ml-1 text-gray-400">R{game.round}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                    {game.opponent_name}
                    {game.opponent_rating && (
                      <span className="ml-1 text-xs text-gray-400">({game.opponent_rating})</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ColorBadge color={game.color_played} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ResultBadge result={game.result} />
                  </td>
                  <td className="max-w-[160px] px-4 py-3 text-gray-600">
                    <div className="truncate">{game.opening_name || "—"}</div>
                    {game.opening_family && (
                      <div className="truncate text-xs text-gray-400">{game.opening_family}</div>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell">
                    {game.eco_code ? <EcoBadge code={game.eco_code} /> : "—"}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-gray-500 sm:table-cell">
                    {game.num_moves ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedGame && (
        <PgnViewerModal game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </>
  );
}
