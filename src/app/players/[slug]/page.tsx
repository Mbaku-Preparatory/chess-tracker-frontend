"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPlayerDetail } from "@/store/slices/playerDetailSlice";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { PerformanceSplitCard } from "@/components/players/PerformanceSplitCard";
import { OpeningBreakdownCard } from "@/components/players/OpeningBreakdownCard";
import { StrengthWeaknessCard } from "@/components/players/StrengthWeaknessCard";
import { PrepRecommendationCard } from "@/components/players/PrepRecommendationCard";
import { GamesTable } from "@/components/players/GamesTable";

export default function PlayerDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useAppDispatch();
  const { player, loading, error } = useAppSelector((s) => s.playerDetail);

  useEffect(() => {
    if (slug) dispatch(fetchPlayerDetail(slug));
  }, [dispatch, slug]);

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (error || !player) {
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

  const ps = player.performance_summary;
  const whiteOpenings = player.opening_stats.filter((o) => o.color_choice === "white");
  const blackOpenings = player.opening_stats.filter((o) => o.color_choice === "black");

  return (
    <div>
      {/* Profile Header */}
      <div className="card mb-8 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700">
            {player.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {player.full_name}
              </h1>
              {player.title && (
                <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-sm font-bold text-amber-800">
                  {player.title}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
              {player.federation && <span>{player.federation}</span>}
              {player.fide_id && <span>FIDE #{player.fide_id}</span>}
              {player.birth_year && <span>Born {player.birth_year}</span>}
            </div>
            {player.bio && (
              <p className="mt-4 max-w-3xl leading-relaxed text-gray-600">
                {player.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ratings Row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Standard"
          value={player.standard_rating ?? "—"}
          sublabel="FIDE Standard"
        />
        <StatCard
          label="Rapid"
          value={player.rapid_rating ?? "—"}
          sublabel="FIDE Rapid"
        />
        <StatCard
          label="Blitz"
          value={player.blitz_rating ?? "—"}
          sublabel="FIDE Blitz"
        />
      </div>

      {/* Performance Summary */}
      {ps && (
        <>
          <SectionContainer title="Performance Overview" subtitle={`Based on ${ps.total_games} games analyzed`}>
            <div className="grid gap-4 sm:grid-cols-5">
              <StatCard label="Games" value={ps.total_games} />
              <StatCard label="Wins" value={ps.wins} variant="success" />
              <StatCard label="Draws" value={ps.draws} variant="warning" />
              <StatCard label="Losses" value={ps.losses} variant="danger" />
              <StatCard
                label="Win Rate"
                value={`${ps.win_rate}%`}
                variant={ps.win_rate >= 50 ? "success" : "danger"}
              />
            </div>
            {ps.summary_text && (
              <div className="card mt-4 p-5">
                <p className="leading-relaxed text-gray-600">
                  {ps.summary_text}
                </p>
              </div>
            )}
          </SectionContainer>

          <SectionContainer title="White vs Black Performance">
            <div className="grid gap-4 sm:grid-cols-2">
              <PerformanceSplitCard
                label="As White"
                games={ps.white_games}
                score={Number(ps.white_score)}
                colorIndicator="white"
              />
              <PerformanceSplitCard
                label="As Black"
                games={ps.black_games}
                score={Number(ps.black_score)}
                colorIndicator="black"
              />
            </div>
          </SectionContainer>
        </>
      )}

      {/* Opening Repertoire */}
      {(whiteOpenings.length > 0 || blackOpenings.length > 0) && (
        <SectionContainer
          title="Opening Repertoire"
          subtitle="Most frequently played openings by color"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <OpeningBreakdownCard
              title="White Openings"
              openings={whiteOpenings}
              colorLabel="White"
            />
            <OpeningBreakdownCard
              title="Black Openings"
              openings={blackOpenings}
              colorLabel="Black"
            />
          </div>
        </SectionContainer>
      )}

      {/* Strengths & Weaknesses */}
      {(player.strengths.length > 0 || player.weaknesses.length > 0) && (
        <SectionContainer title="Strengths & Weaknesses">
          <div className="grid gap-4 sm:grid-cols-2">
            {player.strengths.length > 0 && (
              <StrengthWeaknessCard items={player.strengths} type="strength" />
            )}
            {player.weaknesses.length > 0 && (
              <StrengthWeaknessCard items={player.weaknesses} type="weakness" />
            )}
          </div>
        </SectionContainer>
      )}

      {/* Prep Recommendations */}
      {player.prep_recommendations.length > 0 && (
        <SectionContainer title="Preparation Recommendations">
          <PrepRecommendationCard recommendations={player.prep_recommendations} />
        </SectionContainer>
      )}

      {/* Recent Games */}
      {player.recent_games.length > 0 && (
        <SectionContainer
          title="Recent Games"
          action={
            <Link href={`/players/${player.slug}/games`} className="btn-secondary text-sm">
              View all games
            </Link>
          }
        >
          <GamesTable games={player.recent_games} />
        </SectionContainer>
      )}

      {/* CTA Buttons */}
      <div className="no-print mt-8 flex flex-wrap gap-3">
        <Link href={`/players/${player.slug}/games`} className="btn-primary">
          View All Games
        </Link>

        <Link href={`/players/${player.slug}/prep`} className="btn-secondary">
          View Prep
        </Link>

        {/* Import source buttons */}
        <Link
          href={`/players/${player.slug}/import?source=chesscom`}
          className="inline-flex items-center gap-2 rounded-lg border border-[#7fa650] bg-[#7fa650] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6b8f44] focus:outline-none focus:ring-2 focus:ring-[#7fa650] focus:ring-offset-1"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M10 2a1 1 0 00-1 1v1H8a3 3 0 00-3 3v1H4a1 1 0 000 2h1v1a3 3 0 003 3h.17l-1.9 4.55A1 1 0 007.2 20h9.6a1 1 0 00.93-1.45L15.83 14H16a3 3 0 003-3v-1h1a1 1 0 000-2h-1V7a3 3 0 00-3-3h-1V3a1 1 0 00-1-1h-4z" />
          </svg>
          Chess.com
        </Link>

        <Link
          href={`/players/${player.slug}/import?source=lichess`}
          className="inline-flex items-center gap-2 rounded-lg border border-[#b05000] bg-[#b05000] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#8f4200] focus:outline-none focus:ring-2 focus:ring-[#b05000] focus:ring-offset-1"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M19 22H5v-2h14v2M13 2a3 3 0 00-3 3c0 .88.39 1.67 1 2.22V8l-3 1-2 4h2v1H6l-1 3h14l-1-3h-2v-1h2l-2-4-3-1V7.22c.61-.55 1-1.34 1-2.22a3 3 0 00-1-2.24V2h-1z" />
          </svg>
          Lichess
        </Link>

        <button
          disabled
          title="FIDE import — coming soon"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-[#1a3a6b]/30 bg-[#1a3a6b]/10 px-4 py-2 text-sm font-semibold text-[#1a3a6b]/50"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          FIDE
          <span className="rounded-full bg-[#1a3a6b]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Soon
          </span>
        </button>
      </div>
    </div>
  );
}
