"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { CommonMistakesCard } from "@/components/players/CommonMistakesCard";
import { GamesTable } from "@/components/players/GamesTable";
import { InsightsPanel } from "@/components/players/InsightsPanel";
import { OpeningBreakdownCard } from "@/components/players/OpeningBreakdownCard";
import { PerformanceSplitCard } from "@/components/players/PerformanceSplitCard";
import { QuickPrepCard } from "@/components/players/QuickPrepCard";
import { StrengthWeaknessCard } from "@/components/players/StrengthWeaknessCard";
import { TimePressureCard } from "@/components/players/TimePressureCard";
import { WinConditionCard } from "@/components/players/WinConditionCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { StatCard } from "@/components/ui/StatCard";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchPlayerDetail,
  fetchPlayerPrep,
} from "@/store/slices/playerDetailSlice";
import { api } from "@/lib/api";
import type {
  OpeningStat,
  PlayerDetail,
  PlayerInsights,
  PrepData,
  ScoutingSection,
  ScoutingSectionType,
} from "@/types";

function getSurname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || name;
}

function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toFixed(1)}%`;
}

function getTopOpening(openings: OpeningStat[]): OpeningStat | null {
  if (!openings.length) return null;
  return openings.reduce((best, o) =>
    o.games_count > best.games_count ? o : best
  );
}

function getScoutingSection(
  prepData: PrepData,
  player: PlayerDetail,
  type: ScoutingSectionType
): ScoutingSection | null {
  return (
    prepData.scouting_sections?.find((s) => s.section_type === type) ?? null
  );
}

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
  const repertoire = useAppSelector((state) => state.repertoire);
  const [insights, setInsights] = useState<PlayerInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    if (slug) {
      dispatch(fetchPlayerDetail(slug));
    }
  }, [dispatch, slug]);

  useEffect(() => {
    if (slug) {
      dispatch(fetchPlayerPrep(slug));
    }
  }, [dispatch, slug]);

  useEffect(() => {
    if (!slug) return;
    const ecoCodes = [
      ...repertoire.white,
      ...repertoire.black_vs_e4,
      ...repertoire.black_vs_d4,
    ]
      .map((o) => o.eco_code)
      .filter(Boolean);

    setInsightsLoading(true);
    api
      .getPlayerInsights(slug, ecoCodes)
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => setInsightsLoading(false));
  }, [slug, repertoire]);

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

  const summary = player.performance_summary;
  const playerName = player.full_name;
  const surname = getSurname(playerName);
  const whiteOpenings = player.opening_stats.filter((o) => o.color_choice === "white");
  const blackOpenings = player.opening_stats.filter((o) => o.color_choice === "black");
  const strongestBlackOpening = getTopOpening(blackOpenings);

  const prepSummary = prepData.performance_summary ?? summary;
  const winCondition = getScoutingSection(prepData, player, "win_condition");
  const timePressure = getScoutingSection(prepData, player, "time_pressure");
  const commonMistakes = getScoutingSection(prepData, player, "common_mistakes");
  const quickPrep = getScoutingSection(prepData, player, "quick_prep");
  const comfortZoneCopy =
    strongestBlackOpening?.opening_name ||
    `${surname} is most comfortable when he can generate dynamic play with Black.`;

  return (
    <div className="print:text-sm">
      <PageHeader
        title={`${surname} Preparatory`}
        subtitle={`How to beat ${playerName}. Not a course. A match plan.`}
        actions={
          <div className="no-print flex flex-wrap gap-3">
            <ShareButton slug={player.slug} playerName={playerName} />
            <button onClick={() => window.print()} className="btn-secondary text-sm">
              Print Report
            </button>
            <Link href={`/players/${player.slug}`} className="btn-secondary text-sm">
              Back to profile
            </Link>
          </div>
        }
      />

      <div className="no-print mb-8 overflow-hidden rounded-[32px] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(12,147,231,0.18),_transparent_38%),linear-gradient(180deg,#020617_0%,#0f172a_60%,#111827_100%)] text-white shadow-xl">
        <div className="px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Scouting Dossier</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {prepSummary?.total_games ?? 0} games analyzed
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Opponent Intelligence</span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                Comfort Zone
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">
                {formatPercent(prepSummary?.black_score)} with Black
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-200">{comfortZoneCopy}</p>
            </div>

            <div className="rounded-2xl border border-red-400/15 bg-red-400/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-200">
                Weakness
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">
                {formatPercent(prepSummary?.white_score)} with White
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {prepData.weaknesses[0]?.title ||
                  `${surname} is less convincing when he has to press with White.`}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-400/15 bg-brand-500/10 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-100">
                Prep Priority
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">
                Deny the positions he wants
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {prepData.prep_recommendations[0]?.description ||
                  "Make the game slower, calmer, and more positional than he prefers."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <SectionContainer title="">
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
            If You Remember Nothing Else
          </p>
          <ul className="mt-4 space-y-3">
            {[
              `${surname} scores ${formatPercent(prepSummary?.black_score)} with Black — his danger zone. Respect it.`,
              `With White he only scores ${formatPercent(prepSummary?.white_score)} — that is where you press.`,
              `His best Black weapon is ${
                strongestBlackOpening?.opening_name || "dynamic Sicilian structures"
              }. Deny it early.`,
              "If you have an edge, simplify. He thrives in chaos, not in endings.",
              `One win condition: make ${surname} prove he can improve a quiet position from scratch.`,
            ].map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-amber-900">
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </SectionContainer>

      <SectionContainer title="Executive Summary" subtitle="The high-level case before you look at lines">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Dossier Summary
            </p>
            <p className="mt-3 leading-relaxed text-gray-700">{prepData.bio}</p>
            {prepSummary?.summary_text && (
              <p className="mt-4 border-t border-gray-100 pt-4 leading-relaxed text-gray-600">
                {prepSummary.summary_text}
              </p>
            )}
          </div>

          <div className="card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
              Player Snapshot
            </p>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              {player.federation && (
                <div className="flex items-center justify-between gap-3">
                  <span>Federation</span>
                  <span className="font-semibold text-gray-900">{player.federation}</span>
                </div>
              )}
              {player.fide_id && (
                <div className="flex items-center justify-between gap-3">
                  <span>FIDE ID</span>
                  <span className="font-semibold text-gray-900">{player.fide_id}</span>
                </div>
              )}
              {player.birth_year && (
                <div className="flex items-center justify-between gap-3">
                  <span>Born</span>
                  <span className="font-semibold text-gray-900">{player.birth_year}</span>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <StatCard label="Standard" value={player.standard_rating ?? "—"} sublabel="FIDE Standard" />
              <StatCard label="Rapid" value={player.rapid_rating ?? "—"} sublabel="FIDE Rapid" />
              <StatCard label="Blitz" value={player.blitz_rating ?? "—"} sublabel="FIDE Blitz" />
            </div>
          </div>
        </div>
      </SectionContainer>

      {prepSummary && (
        <SectionContainer title="Key Numbers" subtitle="The core evidence behind the prep">
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

      {winCondition && (
        <SectionContainer title="">
          <WinConditionCard section={winCondition} />
        </SectionContainer>
      )}

      {prepSummary && (
        <SectionContainer
          title="How to Face Him"
          subtitle={`What changes when ${playerName} has White or Black`}
        >
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <PerformanceSplitCard
                label={`${playerName} as White`}
                games={prepSummary.white_games}
                score={Number(prepSummary.white_score)}
                colorIndicator="white"
              />
              <div className="card mt-4 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-600">
                  Weakness
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  With only {formatPercent(prepSummary.white_score)} as White, the burden of proving
                  advantage is where {surname} looks most vulnerable. Keep the position sound and let
                  him be the one who overreaches.
                </p>
              </div>
              {whiteOpenings.length > 0 && (
                <div className="mt-4">
                  <OpeningBreakdownCard
                    title="Opening Breakdown as White"
                    openings={whiteOpenings}
                    colorLabel="White"
                  />
                </div>
              )}
            </div>

            <div>
              <PerformanceSplitCard
                label={`${playerName} as Black`}
                games={prepSummary.black_games}
                score={Number(prepSummary.black_score)}
                colorIndicator="black"
              />
              <div className="card mt-4 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">
                  Comfort Zone
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  At {formatPercent(prepSummary.black_score)} with Black, this is the side where you
                  need the cleanest discipline. Do not hand him easy tactical flow or comfortable
                  ...g6 structures unless you have a concrete reason.
                </p>
              </div>
              {blackOpenings.length > 0 && (
                <div className="mt-4">
                  <OpeningBreakdownCard
                    title="Opening Breakdown as Black"
                    openings={blackOpenings}
                    colorLabel="Black"
                  />
                </div>
              )}
            </div>
          </div>
        </SectionContainer>
      )}

      {timePressure && (
        <SectionContainer title="">
          <TimePressureCard section={timePressure} />
        </SectionContainer>
      )}

      {prepData.strengths.length > 0 && (
        <SectionContainer
          title={`What ${surname} Wants`}
          subtitle="The positions and dynamics that help him most"
        >
          <StrengthWeaknessCard
            items={prepData.strengths}
            type="strength"
            eyebrow="COMFORT ZONE"
            title="What To Respect"
          />
        </SectionContainer>
      )}

      {prepData.weaknesses.length > 0 && (
        <SectionContainer
          title="What to Deny"
          subtitle={`The patterns that create the best practical edge against ${surname}`}
        >
          <StrengthWeaknessCard
            items={prepData.weaknesses}
            type="weakness"
            eyebrow="WEAKNESS"
            title="Where To Press"
          />
        </SectionContainer>
      )}

      {commonMistakes && (
        <SectionContainer title="">
          <CommonMistakesCard section={commonMistakes} />
        </SectionContainer>
      )}

      {prepData.prep_recommendations.length > 0 && (
        <SectionContainer
          title="Prep Priorities"
          subtitle="Actionable scenarios to remember before round start"
        >
          <div className="space-y-4">
            {prepData.prep_recommendations.map((recommendation, index) => (
              <div key={recommendation.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                      Prep Priority
                    </p>
                    <h4 className="mt-1 font-semibold text-gray-900">
                      {recommendation.scenario_title}
                    </h4>
                    {recommendation.description && (
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {recommendation.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionContainer>
      )}

      {player.recent_games.length > 0 && (
        <SectionContainer
          title="Recent Games"
          subtitle={`Last ${player.recent_games.length} games on record`}
        >
          <GamesTable games={player.recent_games} />
          <div className="no-print mt-3 text-right">
            <Link href={`/players/${player.slug}/games`} className="text-sm text-brand-600 hover:underline">
              View all games →
            </Link>
          </div>
        </SectionContainer>
      )}

      {quickPrep && (
        <SectionContainer
          title="One-Page Match Plan"
          subtitle="The fastest read in the entire report"
          className="mt-4"
        >
          <QuickPrepCard section={quickPrep} />
        </SectionContainer>
      )}

      <SectionContainer
        title="Data-Driven Insights"
        subtitle="Rule-based analysis of opening tendencies, weaknesses, and repertoire overlap"
        className="mt-4"
      >
        {insightsLoading ? (
          <div className="space-y-3">
            <div className="h-5 w-48 animate-pulse rounded bg-gray-100" />
            <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
          </div>
        ) : insights ? (
          <InsightsPanel insights={insights} />
        ) : (
          <p className="text-sm text-gray-400">
            Could not load insights. Ensure games are imported for this player.
          </p>
        )}
      </SectionContainer>

      <div className="no-print mt-8 flex flex-wrap items-center justify-center gap-3">
        <ShareButton slug={player.slug} playerName={playerName} />
      </div>

      <div className="mt-12 border-t border-gray-200 pt-6 text-center text-sm text-gray-400 print:mt-8">
        <p>
          Mbaku Preparatory · Scouting dossier for {playerName} · Based on{" "}
          {prepSummary?.total_games ?? 0} analyzed games
        </p>
      </div>
    </div>
  );
}
