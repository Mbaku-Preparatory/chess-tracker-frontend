"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchPlayerDetail } from "@/redux/actions/playerDetail";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { PrepSummaryPanel } from "@/components/players/PrepSummaryPanel";
import { OpeningStudyPlan } from "@/components/players/OpeningStudyPlan";
import { AskAssistant } from "@/components/players/AskAssistant";

type PrepTab = "tree" | "studies" | "ask";

export default function PrepPage() {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useAppDispatch();
  const { player, loading: playerLoading } = useAppSelector((s) => s.playerDetail);
  const [tab, setTab] = useState<PrepTab>("tree");

  useEffect(() => {
    if (slug) dispatch(fetchPlayerDetail(slug));
  }, [dispatch, slug]);

  if (playerLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={player ? `${player.full_name} — Prep` : "Prep"}
        subtitle="Opening tree and study recommendations"
        actions={
          player && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/players/${slug}/import`}
                className="btn-secondary inline-flex items-center gap-1.5 text-sm"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Import Games
              </Link>
              <Link href={`/players/${slug}`} className="btn-secondary text-sm">
                Back to profile
              </Link>
            </div>
          )
        }
      />

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit dark:border-dark-border dark:bg-dark-elevated">
        {([
          { id: "tree" as PrepTab, label: "Opening Tree", icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          )},
          { id: "studies" as PrepTab, label: "Opening Studies", icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          )},
          { id: "ask" as PrepTab, label: "Ask", icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          )},
        ] as { id: PrepTab; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === id
                ? "bg-white shadow text-gray-900 dark:bg-dark-surface dark:text-gray-100 dark:shadow-black/40"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "tree" && <PrepSummaryPanel slug={slug} />}
      {tab === "studies" && <OpeningStudyPlan slug={slug} />}
      {tab === "ask" && (
        <AskAssistant slug={slug} playerName={player?.full_name} />
      )}
    </div>
  );
}
