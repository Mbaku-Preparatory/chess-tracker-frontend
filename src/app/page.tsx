"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PaymentModal } from "@/components/players/PaymentModal";
import { PlayerCard } from "@/components/players/PlayerCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatKesAmount, PREP_PRICE_KES } from "@/lib/marketplace";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPlayers, setSearchQuery } from "@/store/slices/playersSlice";
import { checkAccess, loadPhoneFromStorage } from "@/store/slices/paymentSlice";
import type { Player } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items, loading, searchQuery } = useAppSelector((state) => state.players);
  const { accessMap, phoneNumber } = useAppSelector((state) => state.payment);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    dispatch(loadPhoneFromStorage());
    dispatch(fetchPlayers({}));
  }, [dispatch]);

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
      dispatch(fetchPlayers({ search: query || undefined }));
    },
    [dispatch]
  );

  const handleUnlock = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setShowPayment(true);
  }, []);

  const onPaymentSuccess = useCallback(() => {
    if (!selectedPlayer) {
      return;
    }

    setShowPayment(false);
    router.push(`/players/${selectedPlayer.slug}/prep`);
  }, [router, selectedPlayer]);

  const marketplaceCopy = useMemo(
    () => [
      {
        label: "Search",
        value: "Find your opponent by name or federation.",
      },
      {
        label: "Unlock",
        value: `Buy the prep product from ${formatKesAmount(PREP_PRICE_KES)}.`,
      },
      {
        label: "Win",
        value: "Walk in with an actionable match plan instead of generic theory.",
      },
    ],
    []
  );

  return (
    <div>
      <section className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(12,147,231,0.2),_transparent_38%),linear-gradient(180deg,#020617_0%,#0f172a_58%,#111827_100%)] px-6 py-10 text-white shadow-2xl sm:px-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-200">
              Opponent Intelligence Marketplace
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
              Search your opponent. Buy prep. Win your game.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Mbaku Preparatory turns each opponent into a digital scouting product.
              You are not buying a course. You are buying the fastest practical path
              to understanding how you beat a specific player.
            </p>

            <div className="mt-8 max-w-xl">
              <SearchInput
                placeholder="Search your opponent..."
                onSearch={handleSearch}
                defaultValue={searchQuery}
                className="[&>input]:border-white/10 [&>input]:bg-white [&>input]:text-gray-900 [&>input]:placeholder:text-gray-400"
              />
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {marketplaceCopy.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">
              Marketplace Model
            </p>
            <div className="mt-4 space-y-3">
              {[
                ["Phase 1", "Fixed price per player product."],
                ["Phase 2", "Dynamic pricing for stronger or more in-demand opponents."],
                ["Phase 3", "User-generated scouting with marketplace revenue share."],
              ].map(([phase, body]) => (
                <div
                  key={phase}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4"
                >
                  <p className="text-sm font-semibold text-white">{phase}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                Current Offer
              </p>
              <p className="mt-2 text-3xl font-bold text-white">
                Prep available from {formatKesAmount(PREP_PRICE_KES)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                The moat is actionable prep, not charts for their own sake.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Opponent Marketplace
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">Available prep products</h2>
          </div>
          <Link href="/players" className="btn-secondary text-sm">
            Browse full marketplace
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
            description={
              searchQuery
                ? "Try a different opponent name or federation."
                : "Seed more players to expand the marketplace."
            }
          />
        )}
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        {[
          {
            title: "Player = Product",
            desc: "Each opponent becomes a prep listing you can search, preview, and unlock.",
          },
          {
            title: "Prep Over Theory",
            desc: "The outcome is practical win conditions, weak points, and color-specific plans.",
          },
          {
            title: "Instant Delivery",
            desc: "Pay on the same phone number and reopen the prep whenever you face them again.",
          },
        ].map((feature) => (
          <div key={feature.title} className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">{feature.desc}</p>
          </div>
        ))}
      </section>

      {selectedPlayer && (
        <PaymentModal
          playerSlug={selectedPlayer.slug}
          playerName={selectedPlayer.full_name}
          open={showPayment}
          onClose={() => {
            setShowPayment(false);
            setSelectedPlayer(null);
          }}
          onSuccess={onPaymentSuccess}
        />
      )}
    </div>
  );
}
