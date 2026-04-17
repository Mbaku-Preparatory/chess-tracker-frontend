"use client";

import { useState } from "react";
import type { Game } from "@/types";
import { ColorBadge, EcoBadge, ResultBadge, SourceBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PgnViewerModal } from "./PgnViewerModal";
import { api } from "@/lib/api";

interface GamesTableProps {
  games: Game[];
  loading?: boolean;
  onDeleted?: (gameId: number) => void;
}

export function GamesTable({ games, loading, onDeleted }: GamesTableProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  async function handleDelete(e: React.MouseEvent, gameId: number) {
    e.stopPropagation();
    if (confirmId !== gameId) {
      setConfirmId(gameId);
      return;
    }
    setDeletingId(gameId);
    setConfirmId(null);
    try {
      await api.deleteGame(gameId);
      onDeleted?.(gameId);
    } catch {
      // silently reset — user can retry
    } finally {
      setDeletingId(null);
    }
  }

  function handleRowClick(game: Game) {
    setConfirmId(null);
    setSelectedGame(game);
  }

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
                <th className="hidden whitespace-nowrap px-4 py-3 font-semibold text-gray-600 lg:table-cell">Source</th>
                {onDeleted && <th className="w-10 px-2 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {games.map((game) => (
                <tr
                  key={game.id}
                  onClick={() => handleRowClick(game)}
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
                  <td className="hidden whitespace-nowrap px-4 py-3 lg:table-cell">
                    <SourceBadge source={game.source} />
                  </td>
                  {onDeleted && (
                    <td
                      className="whitespace-nowrap px-2 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {confirmId === game.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleDelete(e, game.id)}
                            disabled={deletingId === game.id}
                            className="rounded px-2 py-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                          >
                            {deletingId === game.id ? "…" : "Confirm"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmId(null); }}
                            className="rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleDelete(e, game.id)}
                          disabled={deletingId === game.id}
                          title="Delete game"
                          className="rounded p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  )}
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
