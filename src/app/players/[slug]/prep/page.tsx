"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { GamesTable } from "@/components/players/GamesTable";
import { OpeningBreakdownCard } from "@/components/players/OpeningBreakdownCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { StatCard } from "@/components/ui/StatCard";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchPlayerDetail,
  fetchPlayerPrep,
} from "@/store/slices/playerDetailSlice";

function ShareButton({
  slug,
  playerName,
  className = "btn-secondary text-sm",
}: {
  slug: string;
  playerName: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/players/${slug}/prep`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${playerName} Prep`, url });
        return;
      } catch {
        // Fallback to clipboard.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [slug, playerName]);

  return (
    <button onClick={handleShare} className={className}>
      {copied ? (
        <>
          <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Link copied
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share Prep Link
        </>
      )}
    </button>
  );
}

export default function PrepPage() {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useAppDispatch();

  const { player, prepData, loading, prepLoading, error, prepError } = useAppSelector(
    (state) => state.playerDetail
  );

  useEffect(() => {
    if (slug) dispatch(fetchPlayerDetail(slug));
  }, [dispatch, slug]);

  useEffect(() => {
    if (slug) dispatch(fetchPlayerPrep(slug));
  }, [dispatch, slug]);

  if (loading || prepLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {error || "Player not found"}
        </h2>
        <Link href="/players" className="btn-primary mt-4 inline-flex">
          Back to players
        </Link>
      </div>
    );
  }

  if (!prepData) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {prepError || "Failed to load prep data."}
        </h2>
        <button
          onClick={() => { if (slug) dispatch(fetchPlayerPrep(slug)); }}
          className="btn-primary mt-4 inline-flex"
        >
          Retry
        </button>
      </div>
    );
  }

  const playerName = player.full_name;
  const prepSummary = prepData.performance_summary ?? player.performance_summary;
  const whiteOpenings = player.opening_stats.filter((o) => o.color_choice === "white").slice(0, 5);
  const blackOpenings = player.opening_stats.filter((o) => o.color_choice === "black").slice(0, 5);

  return (
    <div className="print:text-sm">
      <PageHeader
        title={`${playerName} — Prep`}
        subtitle={`${prepSummary?.total_games ?? 0} games on record`}
        actions={
          <div className="no-print flex flex-wrap gap-3">
            <ShareButton slug={slug} playerName={playerName} />
            <button onClick={() => window.print()} className="btn-secondary text-sm">
              Print
            </button>
            <Link href={`/players/${slug}`} className="btn-secondary text-sm">
              Back to profile
            </Link>
          </div>
        }
      />

      {/* Player Snapshot */}
      <div className="mb-8 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
            Player Snapshot
          </p>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-600">
            {player.federation && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Federation</span>
                <span className="font-semibold text-gray-900">{player.federation}</span>
              </div>
            )}
            {player.fide_id && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">FIDE ID</span>
                <span className="font-semibold text-gray-900">{player.fide_id}</span>
              </div>
            )}
            {player.birth_year && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Born</span>
                <span className="font-semibold text-gray-900">{player.birth_year}</span>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {player.standard_rating && (
              <StatCard label="Standard" value={player.standard_rating} sublabel="FIDE" />
            )}
            {player.rapid_rating && (
              <StatCard label="Rapid" value={player.rapid_rating} sublabel="FIDE" />
            )}
            {player.blitz_rating && (
              <StatCard label="Blitz" value={player.blitz_rating} sublabel="FIDE" />
            )}
          </div>
        </div>
      </div>

      {/* Key Numbers */}
      {prepSummary && (
        <SectionContainer title="Key Numbers">
          <div className="grid gap-4 sm:grid-cols-5">
            <StatCard label="Games" value={prepSummary.total_games} />
            <StatCard
              label="Win Rate"
              value={`${prepSummary.win_rate}%`}
              variant={Number(prepSummary.win_rate) >= 50 ? "success" : "danger"}
            />
            <StatCard label="Wins" value={prepSummary.wins} variant="success" />
            <StatCard label="Draws" value={prepSummary.draws} variant="warning" />
            <StatCard label="Losses" value={prepSummary.losses} variant="danger" />
          </div>
        </SectionContainer>
      )}

      {/* Opening Breakdown */}
      {(whiteOpenings.length > 0 || blackOpenings.length > 0) && (
        <SectionContainer title="Opening Breakdown">
          <div className="grid gap-4 sm:grid-cols-2">
            {whiteOpenings.length > 0 && (
              <OpeningBreakdownCard
                title="As White"
                openings={whiteOpenings}
                colorLabel="White"
              />
            )}
            {blackOpenings.length > 0 && (
              <OpeningBreakdownCard
                title="As Black"
                openings={blackOpenings}
                colorLabel="Black"
              />
            )}
          </div>
          <div className="no-print mt-3 text-right">
            <Link href={`/players/${slug}/games`} className="text-sm text-brand-600 hover:underline">
              View all games →
            </Link>
          </div>
        </SectionContainer>
      )}

      {/* Games */}
      {player.recent_games.length > 0 && (
        <SectionContainer title="Recent Games">
          <GamesTable games={player.recent_games} />
          <div className="no-print mt-3 text-right">
            <Link href={`/players/${slug}/games`} className="text-sm text-brand-600 hover:underline">
              View all games →
            </Link>
          </div>
        </SectionContainer>
      )}

      <div className="no-print mt-8 flex flex-wrap items-center justify-center gap-3">
        <ShareButton slug={slug} playerName={playerName} />
      </div>

      <div className="mt-12 border-t border-gray-200 pt-6 text-center text-sm text-gray-400 print:mt-8">
        Mbaku Preparatory · {playerName} · {prepSummary?.total_games ?? 0} games
      </div>
    </div>
  );
}
