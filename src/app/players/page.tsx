"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PaymentModal } from "@/components/players/PaymentModal";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatKesAmount, PREP_PRICE_KES } from "@/lib/marketplace";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPlayers, setSearchQuery, setCurrentPage } from "@/store/slices/playersSlice";
import { checkAccess, loadPhoneFromStorage } from "@/store/slices/paymentSlice";
import type { Player } from "@/types";

const PAGE_SIZE = 25;

export default function PlayersPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items, total, loading, error, searchQuery, currentPage } = useAppSelector(
    (state) => state.players
  );
  const { accessMap, phoneNumber } = useAppSelector((state) => state.payment);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    dispatch(loadPhoneFromStorage());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchPlayers({ search: searchQuery || undefined, page: currentPage }));
  }, [dispatch, searchQuery, currentPage]);

  useEffect(() => {
    if (!phoneNumber || items.length === 0) {
      return;
    }

    items.forEach((player) => {
      if (accessMap[player.slug] === undefined) {
        dispatch(checkAccess({ slug: player.slug, phone: phoneNumber }));
      }
    });
  }, [accessMap, dispatch, items, phoneNumber]);

  const handleSearch = useCallback(
    (query: string) => {
      dispatch(setSearchQuery(query));
    },
    [dispatch]
  );

  const handleUnlock = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setShowPayment(true);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    if (!selectedPlayer) {
      return;
    }

    setShowPayment(false);
    router.push(`/players/${selectedPlayer.slug}/prep`);
  }, [router, selectedPlayer]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Opponent Marketplace"
        subtitle={`${total} player${total !== 1 ? "s" : ""} listed. Search your opponent and unlock prep from ${formatKesAmount(PREP_PRICE_KES)}.`}
      />

      <div className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(12,147,231,0.08),_transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Search Your Opponent
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Each player is a prep product.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600">
            Browse by name, federation, or rating profile. Open the player profile if you want
            to inspect first, or unlock directly from the marketplace if you already know who
            you are preparing for.
          </p>

          <div className="mt-5">
            <SearchInput
              placeholder="Search your opponent by name or federation..."
              onSearch={handleSearch}
              defaultValue={searchQuery}
              className="max-w-xl"
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">
            Positioning
          </p>
          <div className="mt-4 space-y-3">
            {[
              "Not a chess.com clone.",
              "Not a PGN viewer business.",
              "This is an opponent intelligence system.",
            ].map((line) => (
              <div key={line} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              hasAccess={accessMap[player.slug] ?? false}
              onUnlock={handleUnlock}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No prep products found"
          description="Try adjusting your search query."
        />
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
          <span className="px-3 text-sm text-gray-500">
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

      {selectedPlayer && (
        <PaymentModal
          playerSlug={selectedPlayer.slug}
          playerName={selectedPlayer.full_name}
          open={showPayment}
          onClose={() => {
            setShowPayment(false);
            setSelectedPlayer(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
