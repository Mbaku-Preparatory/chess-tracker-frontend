"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPlayerDetail } from "@/store/slices/playerDetailSlice";
import { checkAccess, loadPhoneFromStorage } from "@/store/slices/paymentSlice";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { PerformanceSplitCard } from "@/components/players/PerformanceSplitCard";
import { OpeningBreakdownCard } from "@/components/players/OpeningBreakdownCard";
import { StrengthWeaknessCard } from "@/components/players/StrengthWeaknessCard";
import { PrepRecommendationCard } from "@/components/players/PrepRecommendationCard";
import { GamesTable } from "@/components/players/GamesTable";
import { PaymentModal } from "@/components/players/PaymentModal";

export default function PlayerDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { player, loading, error } = useAppSelector((s) => s.playerDetail);
  const { accessMap, phoneNumber, loading: accessLoading } = useAppSelector((s) => s.payment);
  const [showPayment, setShowPayment] = useState(false);

  const hasAccess = slug ? accessMap[slug] ?? false : false;

  useEffect(() => {
    dispatch(loadPhoneFromStorage());
  }, [dispatch]);

  useEffect(() => {
    if (slug) dispatch(fetchPlayerDetail(slug));
  }, [dispatch, slug]);

  useEffect(() => {
    if (slug && phoneNumber) {
      dispatch(checkAccess({ slug, phone: phoneNumber }));
    }
  }, [dispatch, slug, phoneNumber]);

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
        <Link
          href={`/players/${player.slug}/import`}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import Games
        </Link>
        {accessLoading ? (
          <button disabled className="btn-secondary inline-flex items-center gap-2 opacity-50">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Checking access...
          </button>
        ) : hasAccess ? (
          <Link href={`/players/${player.slug}/prep`} className="btn-secondary">
            Open Preparatory
          </Link>
        ) : (
          <button
            onClick={() => setShowPayment(true)}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Unlock Preparatory — KES 10
          </button>
        )}
      </div>

      {player && (
        <PaymentModal
          playerSlug={player.slug}
          playerName={player.full_name}
          open={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            router.push(`/players/${player.slug}/prep`);
          }}
        />
      )}
    </div>
  );
}
