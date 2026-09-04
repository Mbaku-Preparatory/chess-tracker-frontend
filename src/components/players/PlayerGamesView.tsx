"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchPlayerDetail } from "@/redux/actions/playerDetail";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpeningTreeView } from "@/components/players/OpeningTreeView";
import { AllGamesView } from "@/components/players/AllGamesView";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { useRefetchWhenImportFinishes } from "@/components/import/useRefetchWhenImportFinishes";

type Tab = "games" | "openings";

export function PlayerGamesView({ slug }: { slug: string }) {
  const dispatch = useAppDispatch();
  const { player, loading } = useAppSelector((s) => s.playerDetail);
  const [activeTab, setActiveTab] = useState<Tab>("games");

  useEffect(() => {
    if (slug) dispatch(fetchPlayerDetail(slug));
  }, [dispatch, slug]);

  // Games landing while this list is open is the whole point of the import.
  useRefetchWhenImportFinishes(
    slug,
    useCallback(() => {
      if (slug) dispatch(fetchPlayerDetail(slug));
    }, [dispatch, slug])
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: "games", label: "All Games" },
    { value: "openings", label: "By Opening" },
  ];

  return (
    <div>
      <PageHeader
        title={player ? `${player.full_name} — Games` : "Games"}
        subtitle={
          activeTab === "games"
            ? "Browse all games with filters"
            : "Drill into any opening to see individual games"
        }
        actions={
          player && (
            <Link href={`/players/${slug}`} className="btn-secondary text-sm">
              Back to profile
            </Link>
          )
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`-mb-px px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {slug && activeTab === "games" && <AllGamesView slug={slug} />}
      {slug && activeTab === "openings" && <OpeningTreeView slug={slug} />}
    </div>
  );
}
